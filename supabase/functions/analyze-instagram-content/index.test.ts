import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

interface Comment {
  text: string;
  ownerUsername?: string;
  likesCount?: number;
}

function sortAndFormatComments(latestComments?: Comment[]): string[] {
  const sorted = [...(latestComments || [])].sort(
    (a, b) => (b.likesCount || 0) - (a.likesCount || 0)
  );
  return sorted.map(c => {
    const username = c.ownerUsername || 'anonymous';
    const likes = c.likesCount || 0;
    return `@${username} (${likes} likes): ${c.text}`;
  });
}

Deno.test("Comments are sorted by likes count descending", () => {
  const comments = sortAndFormatComments([
    { text: "Nice post!", ownerUsername: "user1", likesCount: 5 },
    { text: "Amazing!", ownerUsername: "user2", likesCount: 50 },
    { text: "Cool", ownerUsername: "user3", likesCount: 0 },
    { text: "Love it!", ownerUsername: "user4", likesCount: 120 },
    { text: "Great work", ownerUsername: "user5", likesCount: 20 },
    { text: "Meh", ownerUsername: "user6" },
  ]);

  assertEquals(comments.length, 6);
  assertEquals(comments[0], "@user4 (120 likes): Love it!");
  assertEquals(comments[1], "@user2 (50 likes): Amazing!");
  assertEquals(comments[2], "@user5 (20 likes): Great work");
  assertEquals(comments[3], "@user1 (5 likes): Nice post!");
  assertEquals(comments[4], "@user3 (0 likes): Cool");
  assertEquals(comments[5], "@user6 (0 likes): Meh");
});

Deno.test("Empty comments array is handled", () => {
  assertEquals(sortAndFormatComments([]).length, 0);
});

Deno.test("Undefined latestComments is handled", () => {
  assertEquals(sortAndFormatComments(undefined).length, 0);
});
