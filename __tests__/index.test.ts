import {createRepo, removeRepos, disableColor, runCommand} from '@gitsync/test';
import prePush from '..';
import sync from '@gitsync/sync-command';

beforeAll(() => {
  disableColor();
});

afterAll(() => {
  removeRepos();
});

describe('pre-push command', () => {
  test('run command', async () => {
    const sourceOrigin = await createRepo(true);
    const source = await createRepo();
    await source.run(['remote', 'add', 'origin', sourceOrigin.dir]);

    const targetOrigin = await createRepo(true);
    const target = await createRepo();
    await target.run(['remote', 'add', 'origin', targetOrigin.dir]);

    await source.commitFile('.gitsync.json', JSON.stringify({
      repos: [
        {
          sourceDir: 'package-name',
          target: target.dir,
        }
      ]
    }));
    await source.run(['push', 'origin', 'master']);
    await source.commitFile('package-name/test.txt');

    await runCommand(sync, source, {
      target: target.dir,
      sourceDir: 'package-name',
    });

    await runCommand(prePush, source);

    const result = await targetOrigin.run(['log']);
    expect(result).toContain('test.txt');
  });
});
