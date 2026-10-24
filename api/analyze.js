export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { matchQuery, imageBase64, analysisDepth, apiKey } = req.body;
    if (!matchQuery) {
        return res.status(400).json({ error: 'Match query is required' });
    }

    const RAPIDAPI_KEY = "22735344cdmsh9e9cadbcb292bbap199c91jsn378162cd0469";
    const GEMINI_API_KEY = apiKey || process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return res.status(400).json({ error: 'Gemini API Key လိုအပ်ပါသည်။ Settings တွင် ထည့်သွင်းပါ။' });
    }

    // ၁။ Football API (RapidAPI) မှ Real Match Data ဆွဲထုတ်ခြင်း
    let footballApiData = "Live Football API fixture data unavailable.";
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
            }
        }
    } catch (e) {
        footballApiData = `Football API error: ${e.message}`;
    }

    // ၂။ Gemini AI သို့ Screenshot ပုံနှင့် Real Data များ ပို့၍ သုံးသပ်ခိုင်းခြင်း
    const systemInstruction = "You are Top Tipster AI (Pro Analyst), an elite football betting and odds analyst writing in fluent, professional Burmese language. You specialize in analyzing bookmaker odds screenshots, 1xBet handicap lines, and odds traps.";
    
    const userPromptText = `Analyze this match based on the attached 1xBet odds screenshot and Football API real data:
- Match Query: ${matchQuery}
- Football API Data: ${footballApiData}
- Analysis Focus: ${analysisDepth}

Please read the exact handicap lines, odds values (e.g. 1.5, 6.36, etc.) directly from the attached 1xBet screenshot, and provide a professional Burmese betting analysis focusing on:
1. Tactical & Form Analysis (အသင်းပုံစံနှင့် နည်းစနစ်ပိုင်း)
2. Bookmaker Odds Trap & Handicap Line Analysis (Screenshot ပါ 1xBet ကြေးများနှင့် မာယာများကို အထူးဆန်းစစ်ရန်)
3. Pro Analyst Recommendations (Safe Pick, Alternative Pick, Correct Score)`;

    // Request contents formatting for Gemini Vision API
    let contentsParts = [{ text: userPromptText }];

    if (imageBase64 && imageBase64.includes('base64,')) {
        const mimeType = imageBase64.substring(imageBase64.indexOf(':') + 1, imageBase64.indexOf(';'));
        const base64Data = imageBase64.split('base64,')[1];
        contentsParts.push({
            inline_data: {
                mime_type: mimeType,
                data: base64Data
            }
        });
    }

    try {
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: contentsParts }],
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
