'use client'

import Editor, { OnMount } from "@monaco-editor/react";
import { editor } from "monaco-editor";
type IEditor = editor.IStandaloneCodeEditor;

// fix the cdn timeout
// https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs/loader.js
import { loader } from "@monaco-editor/react";
loader.config({
    paths: {
        vs: "https://fastly.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs"
    }
});

import { useContext, useMemo, useRef, useState } from "react";

import { createLocalFile, ifLocalFileExists, readLocal, writeLocal } from "@app/local";
import PopVqlFileSelector from "@app/window/vql-file-selector";
import { ButtonsWrapper } from "@app/window/buttons";
import { GlobalStateContext } from "@app/state";

export default function VqlEditor({ wKey }: { wKey: number }) {
    //
    const { state, stateDispatch } = useContext(GlobalStateContext);
    const model = state.windowModel;
    let viewDisplayed = model.getViewDisplayed(wKey);
    //
    let editorRef = useRef<IEditor | null>(null);
    let editorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        let textModel = editor.getModel();
        if (textModel) {
            textModel.onDidChangeContent(event => {
                setEditorSaved(false);
            });
            textModel.setEOL(monaco.editor.EndOfLineSequence.LF);
        }
    };
    let [isEditorSaved, setEditorSaved] = useState<boolean>(true);
    let [beforeSaveAs, storeBeforeSaveAs] = useState<string | null>(null);
    //
    let [isSelectorActive, setSelectorActive] = useState<boolean>(false);
    let [editedFilepath, setEditedFilepath] = useState<string>('');
    let selectFile = async (filepath: string) => {
        setEditedFilepath(filepath);
        console.log('selectfile', filepath, 'beforeSaveAs', beforeSaveAs);
        if (beforeSaveAs != null) {
            await writeLocal(filepath, beforeSaveAs);
            storeBeforeSaveAs(null);
        } else {
            editorRef.current?.setValue(await readLocal(filepath));
        }
        setEditorSaved(true);
    }
    //
    const rootdir = '/public/vql/';
    useMemo(async () => {
        let defaultFilepath = rootdir + 'default.vql';
        if (await ifLocalFileExists(defaultFilepath)) {
            await selectFile(defaultFilepath);
        } else {
            await createLocalFile(defaultFilepath);
        }
    }, []);
    //
    let buttons: { desc: string, onClick: () => void, ifEnabled: boolean }[] = useMemo(() => [{
        desc: "Apply",
        onClick: async () => {
            let vqlCode = editorRef.current?.getValue() || '';
            console.log('apply', viewDisplayed, vqlCode);
            if (viewDisplayed !== undefined && vqlCode.length > 0) {
                stateDispatch({ command: 'APPLY', wKey: wKey, vqlCode});
            }
        },
        ifEnabled: true
    }, {
        desc: "Save",
        onClick: async () => {
            await writeLocal(editedFilepath, editorRef.current?.getValue() || '');
            setEditorSaved(true);
        },
        ifEnabled: editedFilepath.length > 0 && !isEditorSaved
    }, {
        desc: "Save As",
        onClick: async () => {
            storeBeforeSaveAs(editorRef.current?.getValue() || '');
            setSelectorActive(true);
        },
        ifEnabled: true
    }, {
        desc: "Discard",
        onClick: async () => {
            setEditorSaved(true);
        },
        ifEnabled: editedFilepath.length > 0 && !isEditorSaved
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }], [viewDisplayed, isEditorSaved]);
    return (
        <>
            <Editor className="vql-editor mx-1 my-1" language="sql" onMount={editorDidMount}/>
            <PopVqlFileSelector isActive={isSelectorActive} setActive={setSelectorActive}
                rootdir={rootdir} selectFile={selectFile}/>
            <ButtonsWrapper direction="left">
                <button className="btn btn-sm btn-primary" onClick={() => setSelectorActive(true)}>
                    <i className="icon icon-apps"></i>
                </button>
                <span className="btn btn-sm btn-link c-auto px-0 text-dark text-bold"
                    style={{overflow: 'hidden'}}>
                    {editedFilepath.slice(editedFilepath.lastIndexOf('/') + 1)}
                </span>
            </ButtonsWrapper>
            <ButtonsWrapper direction="left">
                {...buttons.map((btn, i) => 
                    <button className={`btn btn-sm btn-primary ${btn.ifEnabled ? '' : 'disabled'}`}
                        onClick={btn.onClick} key={i}>
                        {btn.desc}
                    </button>
                )}
            </ButtonsWrapper>
        </>
    );
}
