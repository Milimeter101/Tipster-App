export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { matchQuery, images, analysisDepth, apiKey } = req.body;
    if (!matchQuery) {
        return res.status(400).json({ error: 'Match query is required' });
    }

    const RAPIDAPI_KEY = "22735344cdmsh9e9cadbcb292bbap199c91jsn378162cd0469";
    const GEMINI_API_KEY = apiKey || process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return res.status(400).json({ error: 'Gemini API Key လိုအပ်ပါသည်။ Settings တွင် ထည့်သွင်းပါ။' });
    }

    // ၁။ Football API မှ Real Match Data ဆွဲထုတ်ခြင်း
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

    // ၂။ Gemini AI သို့ ၃ ပုံနှင့်တကွ Value Bets & Multi-Bookmaker Odds များကို ဆန်းစစ်ခိုင်းခြင်း
    const systemInstruction = "You are Top Tipster AI (Pro Analyst), an elite football betting and odds analyst writing in fluent, professional Burmese language. You specialize in multi-screenshot analysis, uncovering value bets, handicap traps, and bookmaker odds discrepancies.";
    
    const userPromptText = `Analyze this match comprehensively based on the provided 3 screenshots (Odds, Team 1 Form, Team 2 Form) and Football API real data:
- Match Query: ${matchQuery}
- Football API Data: ${footballApiData}
- Analysis Focus: ${analysisDepth}

Please read and cross-analyze:
1. Handicap & Odds Screenshot: Identify exact odds, handicap lines, and potential Value Bets where bookmaker pricing might be misaligned.
2. Team 1 Recent Form Screenshot: Analyze trends, goal scoring/conceding ratios.
3. Team 2 Recent Form Screenshot: Analyze trends, goal scoring/conceding ratios.

Provide a professional Burmese betting analysis focusing on:
1. Form & Tactical Trend Analysis (အသင်းနှစ်သင်း၏ နောက်ဆုံးပွဲစဉ် ရလဒ်ပုံစံများနှင့် နှိုင်းယှဉ်ချက်)
2. Bookmaker Odds Traps & Value Bets (ဘွတ်ကီကြေး မာယာများ၊ ထောင်ခောက်များနှင့် တန်ဖိုးရှိသော ရွေးချယ်မှု Value Bets များကို ဖော်ထုတ်ရန်)
3. Pro Analyst Recommendations (Safe Pick, Alternative Pick, Correct Score)`;

    let contentsParts = [{ text: userPromptText }];

    const appendImagePart = (imgBase64, label) => {
        if (imgBase64 && imgBase64.includes('base64,')) {
            const mimeType = imgBase64.substring(imgBase64.indexOf(':') + 1, imgBase64.indexOf(';'));
            const base64Data = imgBase64.split('base64,')[1];
            contentsParts.push({ text: `[Attached Screenshot - ${label}]` });
            contentsParts.push({
                inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                }
            });
        }
    };

    if (images) {
        appendImagePart(images.odds, "1xBet Odds / Handicap Screenshot");
        appendImagePart(images.team1, "Team 1 Recent Games Screenshot");
        appendImagePart(images.team2, "Team 2 Recent Games Screenshot");
    }

    try {
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}`, {
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
