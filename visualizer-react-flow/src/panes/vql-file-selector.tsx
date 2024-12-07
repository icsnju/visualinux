'use client'

import { createLocalFile, getLocalFiles } from "@app/local";

import { Dispatch, SetStateAction, useMemo, useState } from "react";

import Popup from "reactjs-popup";

export default function PopVqlFileSelector({ isActive, setActive, rootdir, selectFile }: {
    isActive: boolean,
    setActive: Dispatch<SetStateAction<boolean>>,
    rootdir: string,
    selectFile: (filepath: string) => void,
}) {
    const [ fileList, setFileList ] = useState<any[]>([]);
    useMemo(async () => {
        setFileList(await getLocalFiles(rootdir));
    }, []);
    const [ fileCreating, setFileCreating ] = useState<string>('');
    const createFile = async (filepath: string) => {
        await createLocalFile(filepath);
        setFileList(await getLocalFiles(rootdir));
        selectFile(filepath);
    };
    return (
        <Popup open={isActive} onClose={() => setActive(false)} contentStyle={{'width': '408px'}} modal>
            <FileList dirpath={rootdir} fileList={fileList} setFileCreating={setFileCreating} genTrigger={
                (filepath: string) => {
                    return () => {
                        selectFile(filepath);
                        setActive(false);
                    };
                }
            }/>
            <FileCreator fileCreating={fileCreating} setFileCreating={setFileCreating} createFile={createFile}/>
        </Popup>
    )
}

function FileList({ dirpath, fileList, setFileCreating, genTrigger }: {
    dirpath: string,
    fileList: any[],
    setFileCreating: Dispatch<SetStateAction<string>>,
    genTrigger: (filename: string) => (() => void),
}) {
    return (
        <ul className="menu">
            {fileList.map((item, index) => typeof item === "object" ?
                <li className="menu-item px-0" key={index}>
                    <div className="accordion">
                        <input type="checkbox" id={`accordion-${item._acco_id}"`} name="accordion-checkbox" hidden/>
                        <label className="accordion-header text-small" htmlFor={`accordion-${item._acco_id}"`}>
                            <i className="icon icon-arrow-right mr-1"></i>
                            {item.dirname}
                        </label>
                        <div className="accordion-body">
                            <FileList dirpath={dirpath + item.dirname + '/'} fileList={item.children}
                                setFileCreating={setFileCreating} genTrigger={genTrigger}/>
                        </div>
                    </div>
                </li>
                :
                <li className="menu-item" key={index} onClick={genTrigger(dirpath + item)}>
                    <a className="text-small">{item}</a>
                </li>
            )}
            <li className="menu-item" onClick={() => setFileCreating(dirpath)}>
                <a className="text-tiny"><i className="icon icon-plus"></i></a>
            </li>
        </ul>
    );
}

function FileCreator({ fileCreating, setFileCreating, createFile }: {
    fileCreating: string,
    setFileCreating: Dispatch<SetStateAction<string>>,
    createFile: (filepath: string) => void
}) {
    const [ filename, setFilename ] = useState<string>('');
    const onClose = () => {
        setFileCreating('');
        setFilename('');
    }
    const onConfirm = () => {
        const toVql = (path: string) => path.endsWith('.vql') ? path : path + '.vql';
        createFile(toVql(fileCreating + filename));
        onClose();
    }
    return (
        <div className={`modal modal-sm ${fileCreating ? 'active' : ''}`}>
            <a className="modal-overlay" aria-label="Close" onClick={onClose}></a>
            {/* <a className="modal-overlay" href="#close" aria-label="Close"></a> */}
            <div className="modal-container p-2 vql-file-creator">
                <input value={filename} onChange={e => setFilename(e.target.value)}/>
                <button className={`btn btn-sm btn-primary ${filename ? '' : 'disabled'}`} onClick={onConfirm}>
                    Create
                </button>
            </div>
        </div>
    );
}
