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

interface CardInfo {
  name: string;
  imageUrl: string;
}

interface SetInfo {
  count: number;
  set_name: string;
  cards: CardInfo[];
}

interface ExclusiveCardInfo {
  set_name: string;
  cards: CardInfo[];
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
): Promise<{
  setCount: Record<string, SetInfo>;
  exclusiveCards: Record<string, ExclusiveCardInfo>;
}> => {
  const setCount: Record<string, SetInfo> = {};
  const cardAppearance: Record<string, Set<string>> = {};
  const cardToSet: Record<
    string,
    { set: string; set_name: string; imageUrl: string }
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

        if (!cardAppearance[cardName]) {
          cardAppearance[cardName] = new Set();
        }
        cardAppearance[cardName].add(set);
        cardToSet[cardName] = { set, set_name, imageUrl: cardInfo.imageUrl };
      });
    }
  }

  const exclusiveCards = Object.entries(cardAppearance)
    .filter(([_, sets]) => sets.size === 1)
    .reduce((acc, [cardName]) => {
      const { set, set_name, imageUrl } = cardToSet[cardName];
      if (!acc[set]) {
        acc[set] = { set_name, cards: [] };
      }
      acc[set].cards.push({ name: cardName, imageUrl });
      return acc;
    }, {} as Record<string, ExclusiveCardInfo>);

  return { setCount, exclusiveCards };
};

const Home: React.FC = () => {
  const [cardList, setCardList] = useState("");
  const [setCounts, setSetCounts] = useState<Record<string, SetInfo>>({});
  const [exclusiveCards, setExclusiveCards] = useState<
    Record<string, ExclusiveCardInfo>
  >({});
  const [loading, setLoading] = useState(false); // Add loading state
  const [expandedSets, setExpandedSets] = useState<Record<string, boolean>>({}); // Track expanded sets
  const [expandedExclusiveSets, setExpandedExclusiveSets] = useState<
    Record<string, boolean>
  >({}); // Track expanded exclusive sets

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true); // Set loading to true at the start
    const { setCount, exclusiveCards } = await countCardsInSets(cardList);
    setSetCounts(setCount);
    setExclusiveCards(exclusiveCards);
    setLoading(false); // Set loading to false at the end
  };

  const toggleSet = (set: string) => {
    setExpandedSets((prevExpandedSets) => ({
      ...prevExpandedSets,
      [set]: !prevExpandedSets[set],
    }));
  };

  const toggleExclusiveSet = (set: string) => {
    setExpandedExclusiveSets((prevExpandedExclusiveSets) => ({
      ...prevExpandedExclusiveSets,
      [set]: !prevExpandedExclusiveSets[set],
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
          {Object.keys(exclusiveCards).length > 0 && (
            <>
              <h2 className="text-xl font-semibold mt-8">Exclusive Cards</h2>
              {Object.entries(exclusiveCards).map(
                ([set, { set_name, cards }], index) => (
                  <div key={index} className="mb-4">
                    <div
                      className="flex justify-between cursor-pointer bg-gray-500 p-2 rounded"
                      onClick={() => toggleExclusiveSet(set)}
                    >
                      <span>{set_name}</span>
                      <span>{expandedExclusiveSets[set] ? "-" : "+"}</span>
                    </div>
                    {expandedExclusiveSets[set] && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
                        {cards.map((card, idx) => (
                          <div key={idx} className="text-center">
                            {card.imageUrl && (
                              <img
                                src={card.imageUrl}
                                alt={card.name}
                                className="w-full h-auto mb-2"
                              />
                            )}
                            <p>{card.name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              )}
            </>
          )}
          <h2 className="text-xl font-semibold mt-8">Set Counts</h2>
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
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-4">
                    {cards.map((card, index) => (
                      <div key={index} className="text-center">
                        {card.imageUrl && (
                          <img
                            src={card.imageUrl}
                            alt={card.name}
                            className="w-full h-auto mb-2"
                          />
                        )}
                        <p>{card.name}</p>
                      </div>
                    ))}
                  </div>
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
