/** Read-only pixel sampling and an actual game-canvas recording, not a second renderer. */
import { writeFile } from 'node:fs/promises';
import { Cdp } from './coop-browser.ts';

export async function startEnergyRecording(p: Cdp) {
    await p.read(`(()=>{const stream=document.querySelector('canvas').captureStream(30),chunks=[];
        const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:1200000});
        recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
        globalThis.energyReviewRecording={recorder,chunks,stream};recorder.start(250);return true;})()`);
}
export async function stopEnergyRecording(p: Cdp, path: string) {
    const data = await p.read<string>(`new Promise(resolve=>{const {recorder,chunks,stream}=energyReviewRecording;
        recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const reader=new FileReader();
        reader.onload=()=>{delete globalThis.energyReviewRecording;resolve(reader.result.split(',')[1])};
        reader.readAsDataURL(new Blob(chunks,{type:'video/webm'}))};recorder.stop();})`);
    await writeFile(path, Buffer.from(data, 'base64'));
}
export type EnergySample = { purple: number; green: number; hash: number };
/** Samples a complete 2.6-second heartbeat inside the actual 44-unit cube. */
export async function sampleEnergyCycle(p: Cdp, cube = 'draft:cargoA'): Promise<EnergySample[]> {
    return p.read(`(async()=>{const samples=[];
        for(let n=0;n<15;n++){const s=customLevel.observe(),body=s.cubes[${JSON.stringify(cube)}],cam=s.camera,
            canvas=document.querySelector('canvas'),ratio=canvas.width/canvas.getBoundingClientRect().width;
            const x=Math.round((body.x-18-cam.x)*cam.zoom*ratio),y=Math.round((body.y-18-cam.y)*cam.zoom*ratio),size=Math.round(36*cam.zoom*ratio);
            const pixels=canvas.getContext('2d').getImageData(x,y,size,size).data;
            let purple=0,green=0,hash=2166136261;
            for(let i=0;i<pixels.length;i+=4){const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
                if(b>65&&b>g*1.25&&r>g*1.15)purple++;if(g>65&&g>r*1.3&&g>b*1.2)green++;
                hash=Math.imul(hash^r,16777619);hash=Math.imul(hash^g,16777619);hash=Math.imul(hash^b,16777619);}
            samples.push({purple,green,hash:hash>>>0});await new Promise(r=>setTimeout(r,200));}
        return samples;})()`);
}
