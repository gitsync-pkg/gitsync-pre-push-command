import {CommandModule} from 'yargs';
import {Config} from '@gitsync/config';
import git, {Git} from "git-cli-wrapper";
import log from "@gitsync/log";
import * as fs from 'fs';
import theme from 'chalk-theme';
import commit from "@gitsync/commit-command";

let command: CommandModule = {
  handler: () => {
  }
};

command.command = 'pre-push';

command.describe = 'A git hook, use to push changed relative repositories\' to remote.';

command.handler = async () => {
  const source = git('.');
  const config = new Config();

  const branch = await getRemoteBranch(source);
  const result = await source.run(['diff', '--cached', '--name-only', branch]);
  if (!result) {
    log.info('No changed files found.');
    return;
  }

  log.info('Found changed files: \n' + result);
  const files = result.split("\n");
  const changedRepos = config.getReposByFiles(files);

  for (const repoConfig of changedRepos) {
    if (repoConfig.squash) {
      log.info(`Sync commit to ${theme.info(repoConfig.sourceDir)}`);
      await runCommand(commit, {
        sourceDir: repoConfig.sourceDir,
        yes: true,
      });
    }

    log.info(`Push to ${theme.info(repoConfig.sourceDir)}`);

    let repoDir = await config.getRepoDirByRepo(repoConfig);
    if (!fs.existsSync(repoDir)) {
      log.warn(`Target repository directory "${theme.info(repoDir)}" does not exists, `
        + `you may try "${theme.info(`gitsync commit ${repoConfig.sourceDir}`)}" to sync commit before push.`);
      continue;
    }

    let repo = git(repoDir);
    const result = await repo.run(['push', '--all', '--follow-tags', 'origin']);
    log.info(result);

    const tagResult = await repo.run(['push', '--tags']);
    log.info(tagResult);
  }

  log.info('Done!');
}

async function runCommand(command: CommandModule, options: any) {
  await command.handler(options);
}

async function getRemoteBranch(repo: Git) {
  const branch = await repo.getBranch();
  const result = (await repo.run(['branch', '-a', '--no-color'])) + '\n';
  if (result.includes('remotes/origin/' + branch + '\n')) {
    return 'origin/' + branch;
  }

  if (branch === 'master') {
    // TODO docs
    // 1. may be a new created repo has no commit
    // 2. may be `git branch --set-upstream-to=origin/<branch> master`
    throw new Error('Cannot find remote branch "origin/master"');
  }

  // Fallback to master
  if (result.includes('remotes/origin/master\n')) {
    return 'origin/master';
  }

  // TODO docs
  throw new Error(`Cannot find remote branch "origin/${branch}' and "origin/master"`);
}

export default command;
