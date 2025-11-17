import { useState } from "react";
import axios from "axios";

export default function SearchComponent() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);

    const searchAnime = async () => {
        const response = await axios.get(
            `http://localhost:5000/api/search?q=${query}`
        );
        setResults(response.data.data);
    };

    return (
        <div>
            <h1>Anime Search</h1>
            <input 
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search anime..."
            />
            <button onClick={searchAnime}>Search</button>

            <div>
                {results.map(anime => (
                    <div key={anime.mal_id}>
                        <h2>{anime.title}</h2>
                        <img src={anime.images.jpg.image_url} alt={anime.title} width={120} />
                        <p>{anime.synopsis}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
