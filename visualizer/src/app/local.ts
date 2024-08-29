'use server'

import { promises as fs } from "fs";

export async function readLocal(relpath: string) {
    const path = process.cwd() + relpath;
    const data = await fs.readFile(path, 'utf8');
    return data;
}

export async function writeLocal(relpath: string, data: string) {
    const path = process.cwd() + relpath;
    await fs.writeFile(path, data, 'utf8');
}

export async function mtimeLocal(relpath: string) {
    const path = process.cwd() + relpath;
    const data = (await fs.stat(path)).mtime.getTime();
    return data;
}

export async function getLocalFiles(relpath: string) {
    const path = process.cwd() + relpath;
    return await __getLocalFiles(path);
}
async function __getLocalFiles(path: string, _acco_id: number = 0) {
    const fileList: any[] = [];
    const files = await fs.readdir(path);
    for (let file of files) {
        const filepath = path + '/' + file;
        if ((await fs.lstat(filepath)).isDirectory()) {
            _acco_id += 1;
            fileList.push({
                dirname: file,
                children: await __getLocalFiles(filepath, _acco_id),
                _acco_id: _acco_id
            });
        } else {
            fileList.push(file);
        }
    }
    return fileList;
}

export async function ifLocalFileExists(relpath: string) {
    const path = process.cwd() + relpath;
    try {
        await fs.access(path, fs.constants.R_OK | fs.constants.W_OK);
        return true;
    } catch {
        return false;
    }
}

export async function createLocalFile(relpath: string) {
    const path = process.cwd() + relpath;
    if (await ifLocalFileExists(path)) {
        throw Error(`to-create file exists: ${relpath}`);
    } else {
        const fh = await fs.open(path, 'a');
        fh.write('\n');
        fh.close();
    }
}
