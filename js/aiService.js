const CONFIG_KEY = 'ai_poetry_config';
const REMOTE_CONFIG_URL = 'https://ai-pages.dc616fa1.er.aliyun-esa.net/api/storage?key=config';
const DECRYPT_KEY = 'shfn73fnein348un';
function decryptConfig(e) { try { const d = CryptoJS.RC4.decrypt(e, DECRYPT_KEY).toString(CryptoJS.enc.Utf8); if (!d) return null; const c = JSON.parse(d); c.modelName = 'GLM-4-Flash'; return c; } catch (e) { return null; } }
async function fetchRemoteConfig() { try { const r = await fetch(REMOTE_CONFIG_URL); if (!r.ok) return null; const d = await r.json(); if (d && d.value) { const c = decryptConfig(d.value); if (c && c.apiUrl && c.apiKey) { localStorage.setItem(CONFIG_KEY + '_remote', JSON.stringify(c)); return c; } } return null; } catch (e) { return null; } }
function getModelConfig() { try { const u = localStorage.getItem(CONFIG_KEY); if (u) { const p = JSON.parse(u); if (p && p.apiUrl && p.apiKey && p.modelName) return p; } const r = localStorage.getItem(CONFIG_KEY + '_remote'); if (r) return JSON.parse(r); return null; } catch (e) { return null; } }
function saveModelConfig(c) { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); }
async function initConfig() { const c = getModelConfig(); if (c) return c; return await fetchRemoteConfig(); }

async function generate(type, theme, style, occasion, onMessage, onComplete, onError) {
    let config = getModelConfig(); if (!config || !config.apiUrl || !config.apiKey) config = await fetchRemoteConfig();
    if (!config) { onError(new Error('请先配置模型')); return; }
    const styleMap = { classic: '古典雅致', festive: '喜庆吉祥', romantic: '浪漫唯美', inspiring: '励志向上', humorous: '诙谐幽默' };
    const occasionMap = { newyear: '春节新年', wedding: '婚庆喜事', birthday: '生日祝寿', business: '开业乔迁', general: '通用' };
    const prompts = {
        couplet: `请创作一副精彩的对联。
主题/关键词：${theme || '新春祝福'}
风格：${styleMap[style]}
场合：${occasionMap[occasion]}

请输出：
上联：（7-11字）
下联：（7-11字）
横批：（4字）

【寓意】（简要解释对联的含义）`,
        acrostic: `请创作一首藏头诗，藏头字为"${theme || '心想事成'}"。
风格：${styleMap[style]}

请输出完整的诗句，每行开头的字组合起来就是藏头内容。
并在最后解释诗意。`,
        seven: `请创作一首七言诗。
主题：${theme || '春天'}
风格：${styleMap[style]}

请输出四句或八句的七言诗，并解释诗意。`,
        five: `请创作一首五言诗。
主题：${theme || '明月'}
风格：${styleMap[style]}

请输出四句或八句的五言诗，并解释诗意。`,
        ci: `请创作一首宋词。
主题：${theme || '相思'}
风格：${styleMap[style]}

选择一个合适的词牌名，创作一首完整的宋词，并解释词意。`
    };
    const controller = new AbortController();
    try {
        const response = await fetch(`${config.apiUrl}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` }, body: JSON.stringify({ model: config.modelName, messages: [{ role: 'user', content: prompts[type] }], stream: true, temperature: 0.9 }), signal: controller.signal });
        if (!response.ok) throw new Error(`请求失败: ${response.status}`);
        const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
        while (true) { const { done, value } = await reader.read(); if (done) { onComplete(); break; } buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || ''; for (const line of lines) { if (line.startsWith('data: ')) { const data = line.slice(6).trim(); if (data === '[DONE]') { onComplete(); return; } try { const content = JSON.parse(data).choices?.[0]?.delta?.content; if (content) onMessage(content); } catch (e) { } } } }
    } catch (error) { if (error.name !== 'AbortError') onError(error); }
}
window.AIService = { getModelConfig, saveModelConfig, initConfig, generate };
