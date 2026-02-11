const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const CLIENT_ID = "YOUR_CLIENT_ID_HERE"; // replace with your MAL Client ID
const query = "naruto";

async function searchAnime() {
  const url = `https://api.myanimelist.net/v2/anime?q=${query}&limit=3`;

  const res = await fetch(url, {
    headers: { "X-MAL-CLIENT-ID": CLIENT_ID }
  });

  if (!res.ok) {
    console.error("Error:", res.status, await res.text());
    return;
  }

  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

searchAnime();