import React, { useState } from "react";
import axios from "axios";

const fetchCardData = async (cardName: string) => {
  const url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(
    cardName
  )}`;

  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching data for card: ${cardName}`, error);
    return null;
  }
};

const getCardSets = async (cardData: { prints_search_uri: any; name: any }) => {
  const sets: any[] = [];
  if (cardData && cardData.prints_search_uri) {
    const url = cardData.prints_search_uri;
    try {
      const response = await axios.get(url);
      const prints = response.data;
      prints.data.forEach((printData: { set: any }) => {
        sets.push(printData.set);
      });
    } catch (error) {
      console.error(`Error fetching prints for card: ${cardData.name}`, error);
    }
  }
  return sets;
};

const countCardsInSets = async (cardList: string) => {
  const setCount: { [key: string]: any } = {};
  const cardNames = cardList
    .split("\n")
    .map((name: string) => name.trim())
    .filter((name: any) => name);
  for (const cardName of cardNames) {
    const cardData = await fetchCardData(cardName);
    if (cardData) {
      const sets = await getCardSets(cardData);
      sets.forEach((cardSet) => {
        if (setCount[cardSet]) {
          setCount[cardSet]++;
        } else {
          setCount[cardSet] = 1;
        }
      });
    }
  }
  return setCount;
};

const Home = () => {
  const [cardList, setCardList] = useState<any>("");
  const [setCounts, setSetCounts] = useState<any>({});

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const counts: { [key: string]: number } = await countCardsInSets(cardList);
    setSetCounts(counts);
  };

  return (
    <div>
      <h1>MTG Card Set Counter</h1>
      <form onSubmit={handleSubmit}>
        <textarea
          rows={10}
          cols={50}
          value={cardList}
          onChange={(e) => setCardList(e.target.value)}
          placeholder="Paste your list of card names here, one per line."
        ></textarea>
        <br />
        <button type="submit">Count Cards in Sets</button>
      </form>
      <h2>Set Counts:</h2>
      <ul>
        {Object.entries(setCounts).map(([set, count]) => (
          <li key={set}>
            {set}: {count}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Home;
