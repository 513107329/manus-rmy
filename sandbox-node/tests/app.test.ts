import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { createApp } from '../src/main';
import { FileService } from '../src/services/file.service';

describe('FileService', () => {
  let tmpDir: string;
  let service: FileService;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sandbox-node-'));
    service = new FileService();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('reads and writes files', async () => {
    const filepath = path.join(tmpDir, 'hello.txt');
    await service.writeFile(filepath, 'hello\nworld', false, false, false, false);
    const read = await service.readFile(filepath);
    expect(read.content).toBe('hello\nworld');
  });

  it('replaces content in file', async () => {
    const filepath = path.join(tmpDir, 'replace.txt');
    await service.writeFile(filepath, 'foo bar foo', false, false, false, false);
    const result = await service.replaceInFile(filepath, 'foo', 'baz', false);
    expect(result.replace_count).toBe(2);
    const read = await service.readFile(filepath);
    expect(read.content).toBe('baz bar baz');
  });

  it('searches file with regex', async () => {
    const filepath = path.join(tmpDir, 'search.txt');
    await service.writeFile(filepath, 'line1\nerror here\nline3', false, false, false, false);
    const result = await service.searchInFile(filepath, 'error', false);
    expect(result.matches).toEqual(['error here']);
    expect(result.line_numbers).toEqual([1]);
  });

  it('checks file existence', async () => {
    const filepath = path.join(tmpDir, 'exists.txt');
    await service.writeFile(filepath, 'x', false, false, false, false);
    const exists = await service.checkFileExists(filepath);
    expect(exists.exists).toBe(true);
  });
});

describe('Sandbox API', () => {
  const app = createApp();
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sandbox-api-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('POST /api/file/write-file and read-file', async () => {
    const filepath = path.join(tmpDir, 'api.txt').replace(/\\/g, '/');
    await request(app)
      .post('/api/file/write-file')
      .send({ filepath, content: 'api content', append: false, leading_newline: false, trailing_newline: false, sudo: false })
      .expect(200)
      .expect((res) => {
        expect(res.body.code).toBe(200);
        expect(res.body.data.filepath).toBe(filepath);
      });

    const readRes = await request(app)
      .post('/api/file/read-file')
      .send({ filepath, sudo: false })
      .expect(200);

    expect(readRes.body.data.content).toBe('api content');
  });

  it('POST /api/file/check-file-exists', async () => {
    const filepath = path.join(tmpDir, 'missing.txt').replace(/\\/g, '/');
    const res = await request(app)
      .post('/api/file/check-file-exists')
      .send({ filepath })
      .expect(200);
    expect(res.body.data.exists).toBe(false);
  });
});
