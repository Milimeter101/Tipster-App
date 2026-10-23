export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { matchQuery, analysisDepth, apiKey } = req.body;
    if (!matchQuery) {
        return res.status(400).json({ error: 'Match query is required' });
    }

    // 🔑 သင့်ရဲ့ RapidAPI Key ကို ဤနေရာတွင် တိုက်ရိုက်ထည့်သွင်းပြီးပါပြီ
    const RAPIDAPI_KEY = "22735344cdmsh9e9cadbcb292bbap199c91jsn378162cd0469";
    const GEMINI_API_KEY = apiKey || process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return res.status(400).json({ error: 'Gemini API Key လိုအပ်ပါသည်။ Settings တွင် ထည့်သွင်းပါ။' });
    }

    // ၁။ Football API (RapidAPI) မှ Real Data ဆွဲထုတ်ခြင်း
    let footballApiData = "Live Football API data unavailable.";
    try {
        const apiRes = await fetch(`https://api-football-v1.p.rapidapi.com/v3/fixtures?search=${encodeURIComponent(matchQuery)}`, {
            headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
            }
        });
        if (apiRes.ok) {
            const apiJson = await apiRes.json();
            if (apiJson.response && apiJson.response.length > 0) {
                const fix = apiJson.response[0];
                footballApiData = `Match Found: ${fix.teams.home.name} vs ${fix.teams.away.name} | League: ${fix.league.name} (${fix.league.country}) | Date: ${fix.fixture.date} | Status: ${fix.fixture.status.long}`;
            } else {
                footballApiData = `Match query '${matchQuery}' API တွင် တိုက်ရိုက်မတွေ့ရှိပါ။ အထွေထွေအချက်အလက်ဖြင့် ဆန်းစစ်ပါ။`;
            }
        } else {
            footballApiData = `Football API response status: ${apiRes.status}`;
        }
    } catch (e) {
        footballApiData = `Football API fetch error: ${e.message}`;
    }

    // ၂။ Gemini AI သို့ Real Data နှင့်တကွ ပို့၍ သုံးသပ်ခိုင်းခြင်း
    const systemInstruction = "You are Top Tipster AI (Pro Analyst), an elite football betting and odds analyst writing in professional Burmese language. Analyze the provided Football API real data, bookmaker odds traps, and handicap lines.";
    const userPrompt = `Analyze this match based on real data:\nMatch Query: ${matchQuery}\nFootball API Data: ${footballApiData}\nAnalysis Focus: ${analysisDepth}\nProvide professional Burmese betting analysis with safe picks and handicap traps.`;

    try {
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: userPrompt }] }],
                systemInstruction: { parts: [{ text: systemInstruction }] }
            })
        });

        const geminiJson = await geminiRes.json();
        if (geminiJson.candidates && geminiJson.candidates[0].content.parts[0].text) {
            return res.status(200).json({ 
                analysis: geminiJson.candidates[0].content.parts[0].text
            });
        } else {
            throw new Error(geminiJson.error?.message || 'Gemini AI response failed.');
        }

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
