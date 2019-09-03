import {CommandModule} from 'yargs';
import {Config} from '@gitsync/config';
import git from "ts-git";
import log from "@gitsync/log";

let command: CommandModule = {
  handler: () => {
  }
};

command.command = 'pre-push';

command.describe = 'A git hook, use to push changed relative repositories\' to remote.';

command.handler = async () => {
  const source = git('.');
  const config = new Config();

  // TODO refined branch
  const result = await source.run(['diff', '--cached', '--name-only', 'origin/' + await source.getBranch()]);
  if (!result) {
    log.info('No changed files found.');
    return;
  }

  log.info('Found changed files: \n' + result);
  const files = result.split("\n");
  const changedRepos = config.getReposByFiles(files);

  for (const repoConfig of changedRepos) {
    let dir = config.getRepoDir(repoConfig.repo);
    let repo = git(dir);
    await repo.run(['push', '--all', 'origin']);
  }

  log.warn('Done!');
}

export default command;
