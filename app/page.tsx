import { getTweet } from "react-tweet/api";
import type { Tweet as TweetData } from "react-tweet/api";
import { PresentationClient } from "@/app/presentation-client";
import type { PresentationTweets } from "@/app/presentation-client";

const tweetIds = {
  accountCreationBug: "1551634302265446401",
  beloLeaving: "1641873478675488783",
  rauchTimeToConfetti: "1329079593915928580",
} satisfies Record<keyof PresentationTweets, string>;

async function loadTweet(id: string): Promise<TweetData | undefined> {
  try {
    return await getTweet(id, { cache: "force-cache" });
  } catch (error) {
    console.error(`Unable to load tweet ${id}`, error);
    return undefined;
  }
}

export default async function HomePage() {
  const entries = await Promise.all(
    Object.entries(tweetIds).map(async ([key, id]) => [key, await loadTweet(id)]),
  );

  return <PresentationClient tweets={Object.fromEntries(entries)} />;
}
