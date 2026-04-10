const e=globalThis;e.runtime.onInstalled.addListener(()=>{console.log("Royalty Trojan installed")});e.runtime.onMessage.addListener((n,r,s)=>(s({success:!0}),!0));
