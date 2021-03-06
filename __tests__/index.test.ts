import {catchError, createRepo, runCommand} from '@gitsync/test';
import prePush from '..';
import * as fs from 'fs';
import sync from '@gitsync/sync-command';

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

  test('run on repo without remote', async () => {
    const source = await createRepo();

    await source.commitFile('.gitsync.json', JSON.stringify({
      repos: [
        {
          sourceDir: 'package-name'
        }
      ]
    }));

    const error = await catchError(async () => {
      await runCommand(prePush, source);
    });

    expect(error).toEqual(new Error('Cannot find remote branch "origin/master"'));
  });

  test('run on repo with new branch', async () => {
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

    await source.run(['checkout', '-b', 'new-branch']);
    await source.commitFile('package-name/test.txt');

    await runCommand(sync, source, {
      target: target.dir,
      sourceDir: 'package-name',
    });

    await runCommand(prePush, source);

    const result = await targetOrigin.run(['log', '--all']);
    expect(result).toContain('test.txt');
  });

  test('squash repository will run commit before pre push', async () => {
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
          squash: true,
        }
      ]
    }));
    await source.run(['push', 'origin', 'master']);
    await source.commitFile('package-name/test.txt');

    await runCommand(prePush, source);

    expect(fs.existsSync(target.getFile('test.txt')));

    const result = await targetOrigin.run(['log', '--format=%s']);
    expect(result).toContain('chore(sync): squash commits from 4b825dc642cb6eb9a060e54bf8d69288fbee4904 to');
  });
});
