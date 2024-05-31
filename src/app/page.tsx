"use client";
import React, { useState } from "react";
import axios from "axios";

interface CardData {
  name: string;
  prints_search_uri: string;
}

interface PrintData {
  set: string;
  set_name: string;
  image_uris?: {
    normal?: string;
    large?: string;
  };
}

const fetchCardData = async (cardName: string): Promise<CardData | null> => {
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

const getCardSets = async (cardData: CardData): Promise<PrintData[]> => {
  const sets: PrintData[] = [];
  if (cardData && cardData.prints_search_uri) {
    const url = cardData.prints_search_uri;
    try {
      const response = await axios.get(url);
      const prints = response.data;
      prints.data.forEach((printData: any) => {
        sets.push({
          set: printData.set,
          set_name: printData.set_name,
          image_uris: printData.image_uris,
        });
      });
    } catch (error) {
      console.error(`Error fetching prints for card: ${cardData.name}`, error);
    }
  }
  return sets;
};

const basicLands = ["Forest", "Island", "Mountain", "Plains", "Swamp"];

const countCardsInSets = async (
  cardList: string
): Promise<
  Record<
    string,
    {
      count: number;
      set_name: string;
      cards: { name: string; imageUrl: string }[];
    }
  >
> => {
  const setCount: Record<
    string,
    {
      count: number;
      set_name: string;
      cards: { name: string; imageUrl: string }[];
    }
  > = {};
  const cardLines = cardList
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);
  for (const line of cardLines) {
    const cardName = line.replace(/^\d+\s+/, ""); // Remove the quantity and space
    if (basicLands.includes(cardName)) continue; // Skip basic lands

    const cardData = await fetchCardData(cardName);
    if (cardData) {
      const sets = await getCardSets(cardData);
      sets.forEach(({ set, set_name, image_uris }) => {
        const cardInfo = {
          name: cardName,
          imageUrl: image_uris?.normal || image_uris?.large || "",
        };
        if (setCount[set]) {
          if (!setCount[set].cards.find((card) => card.name === cardName)) {
            setCount[set].count++;
            setCount[set].cards.push(cardInfo);
          }
        } else {
          setCount[set] = { count: 1, set_name, cards: [cardInfo] };
        }
      });
    }
  }
  return setCount;
};

const Home: React.FC = () => {
  const [cardList, setCardList] = useState("");
  const [setCounts, setSetCounts] = useState<
    Record<
      string,
      {
        count: number;
        set_name: string;
        cards: { name: string; imageUrl: string }[];
      }
    >
  >({});
  const [loading, setLoading] = useState(false); // Add loading state
  const [expandedSets, setExpandedSets] = useState<Record<string, boolean>>({}); // Track expanded sets

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true); // Set loading to true at the start
    const counts = await countCardsInSets(cardList);
    setSetCounts(counts);
    setLoading(false); // Set loading to false at the end
  };

  const toggleSet = (set: string) => {
    setExpandedSets((prevExpandedSets) => ({
      ...prevExpandedSets,
      [set]: !prevExpandedSets[set],
    }));
  };

  const sortedSetCounts = Object.entries(setCounts).sort(
    (a, b) => b[1].count - a[1].count
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">MTG Card Set Counter</h1>
      <form onSubmit={handleSubmit} className="mb-4">
        <textarea
          rows={10}
          cols={50}
          value={cardList}
          onChange={(e) => setCardList(e.target.value)}
          placeholder="Paste your list of card names here, one per line."
          className="w-full p-2 border border-gray-300 rounded text-black"
        ></textarea>
        <br />
        <button
          type="submit"
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Count Cards in Sets
        </button>
      </form>
      {loading ? (
        <p>Loading...</p> // Conditionally render loading message
      ) : (
        <>
          <h2 className="text-xl font-semibold">Set Counts:</h2>
          <ul className="list-none">
            {sortedSetCounts.map(([set, { count, set_name, cards }]) => (
              <li key={set} className="mb-2">
                <div
                  className="flex justify-between cursor-pointer bg-gray-500 p-2 rounded"
                  onClick={() => toggleSet(set)}
                >
                  <span>
                    {set_name} ({set}): {count}
                  </span>
                  <span>{expandedSets[set] ? "-" : "+"}</span>
                </div>
                {expandedSets[set] && (
                  <ul className="ml-4 list-none">
                    {cards.map((card, index) => (
                      <li key={index} className="ml-4">
                        {card.imageUrl && (
                          <img
                            src={card.imageUrl}
                            alt={card.name}
                            className="w-64 h-auto mb-2"
                          />
                        )}
                        {card.name}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default Home;
