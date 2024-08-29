'use server'

import OpenAI from "openai";
import { HttpsProxyAgent } from "https-proxy-agent";

// local test only
// should be removed on publishment
const VL_LLM_PROXY_URL = 'http://127.0.0.1:7890';
// console.log(`proxy_url: ${VL_LLM_PROXY_URL}`);
let httpAgent = new HttpsProxyAgent(VL_LLM_PROXY_URL);

const openai = new OpenAI({
    apiKey: "etst",
    httpAgent: httpAgent,
    timeout: 1 * 1000,
    maxRetries: 1
});

export async function testGPT() {
    let msg: any = '';
    await openai.chat.completions.create({
        messages: [{ role: "system", content: "You are a helpful assistant." }],
        model: "gpt-3.5-turbo",
    })
    .then(completion => {
        msg = completion?.choices[0];
        console.log('test chatgpt ok:', msg);
    })
    .catch(error => {
        if (error instanceof OpenAI.APIError) {
            console.log('test chatgpt error:', error.message);
            // console.log(error.status, error.name, error.message);
            msg = error.message;
        } else {
            msg = '[Unknown Error]' + error.message;
        }
    });
    return msg;
}
