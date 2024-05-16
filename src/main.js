const core = require('@actions/core');
const { Octokit } = require('@octokit/rest');
import * as webhook from '@octokit/webhooks'
const github = require('@actions/github');
const translate = require('@xrkffgg/google-translate');

// **********************************************************
const token = core.getInput('token');
const octokit = new Octokit({ auth: `token ${token}` });
const context = github.context;

async function run() {
  try {
    const eventName = context.eventName;
    const action = context.payload.action;
    core.info(`[eventName: ${eventName}] [action: ${action}]`)
    const { owner, repo } = context.repo;
    if (((eventName === 'issues' || eventName  === 'pull_request' || eventName === 'pull_request_target') &&
            action == 'opened') ||
        (eventName === 'issue_comment' && action === 'created')
    ) {
      let number = null
      let issueUser = null
      let title = null
      let body = null

      if (context.eventName === 'issue_comment') {
        const issueCommentPayload = github.context.payload as webhook.EventPayloads.WebhookPayloadIssueComment
        number = issueCommentPayload.issue.number;
        issueUser = issueCommentPayload.comment.user.login
        body = issueCommentPayload.comment.body

        core.info(`[issue_comment] [number: ${number}] [issueUser: ${issueUser}] [body: ${body}]`);
        return

      } else if (context.eventName === 'issues') {
        number = context.payload.issue.number;
        title = context.payload.issue.title;
        body = context.payload.issue.body;
      } else {
        number = context.payload.pull_request.number;
        title = context.payload.pull_request.title;
        body = context.payload.pull_request.body;
      }

      const translateTitle = core.getInput('translate-title') || 'true';
      const translateBody = core.getInput('translate-body') || 'true';

      if (translateTitle == 'true' && containsChinese(title)) {
        const { text: newTitle } = await translate(title, { to: 'en' });
        core.info(`[translate] [title out: ${newTitle}]`);
        await octokit.issues.update({
          owner,
          repo,
          issue_number: number,
          title: newTitle,
        });
        core.info(`[update title] [number: ${number}]`);
      }

      if (translateBody == 'true' && containsChinese(body)) {
        const { text: newBody } = await translate(body, { to: 'en' });
        core.info(`[translate] [body out: ${newBody}]`);
        await octokit.issues.createComment({
          owner,
          repo,
          issue_number: number,
          body: newBody,
        });
        core.info(`[create comment] [number: ${number}]`);
      }
    } else {
      core.setFailed(
        `This Action now only support "issues" or "pull_request" or "pull_request_target" "opened". Got eventName=${context.eventName} and action=${context.payload.action}. If you need other, you can open a issue to https://github.com/actions-cool/translation-helper`,
      );
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

function containsChinese(t) {
  const result = /[\u4e00-\u9fa5]/.test(t);
  core.info(`[ContainsChinese Test][${t}] result is ${result}`);
  return result;
}

run();
