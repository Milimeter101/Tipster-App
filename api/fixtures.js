export default async function handler(req, res) {
    const RAPIDAPI_KEY = "22735344cdmsh9e9cadbcb292bbap199c91jsn378162cd0469";
    const todayDate = new Date().toISOString().split('T')[0]; // ယနေ့ရက်စွဲ (YYYY-MM-DD)

    try {
        const apiRes = await fetch(`https://api-football-v1.p.rapidapi.com/v3/fixtures?date=${todayDate}`, {
            headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
            }
        });

        if (apiRes.ok) {
            const json = await apiRes.json();
            if (json.response && json.response.length > 0) {
                // ထင်ရှားသော ပွဲစဉ်အမည်များကို (Team A vs Team B) ပုံစံဖြင့် ဖြတ်ထုတ်ခြင်း
                const fixtures = json.response.slice(0, 10).map(f => `${f.teams.home.name} vs ${f.teams.away.name}`);
                return res.status(200).json({ fixtures });
            }
        }
        return res.status(200).json({ fixtures: ["Chelsea vs Tottenham", "Real Madrid vs Barcelona", "Arsenal vs Man City"] });
    } catch (e) {
        return res.status(200).json({ fixtures: ["Chelsea vs Tottenham", "Real Madrid vs Barcelona", "Arsenal vs Man City"] });
    }
}
