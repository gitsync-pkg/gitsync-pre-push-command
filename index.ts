import {Arguments, CommandModule} from 'yargs';
import {Config} from '@gitsync/config';
import git, {Git} from "ts-git";
import log from "@gitsync/log";
import commit from '@gitsync/commit-command';

let command: CommandModule = {
  handler: () => {
  }
};

command.command = 'pre-push';

command.describe = 'A git hook, use to push changed relative repositories\' to remote.';

command.handler = async () => {
  const source = git('.');
  const config = new Config();

  const result = await source.run(['diff', '--cached', '--name-only']);
  log.info('Found changed files: \n' + result);

  const files = result.split("\n");
  const changedRepos = config.getReposFromFiles(files);

  for (const repoConfig of changedRepos) {
    let dir = config.getRepoDir(repoConfig.remote);
    let repo = git(dir);
    await repo.run(['push', '--all', 'origin']);
  }

  log.warn('Done!');
}

export default command;
