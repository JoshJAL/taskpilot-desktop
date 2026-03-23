#!/usr/bin/env node
/**
 * Quick script to undo the wrongly-completed Trello items.
 *
 * Usage: Get your session cookie from the desktop app's dev console:
 *   In the app, press Ctrl+Shift+I, go to Console, type: allow pasting
 *   Then run: JSON.stringify(await window.taskpilot.getSettings())
 *   Copy the serverUrl and sessionCookie values.
 *
 * Then run: node scripts/undo-trello.mjs <serverUrl> <sessionCookie> <targetListId>
 *
 * To find the targetListId, first run without it to see the board's lists.
 */

const [,, serverUrl, cookie, targetListId] = process.argv;

if (!serverUrl || !cookie) {
  console.log("Usage: node scripts/undo-trello.mjs <serverUrl> <sessionCookie> [targetListId]");
  console.log("\nTo get these values, in the desktop app dev console run:");
  console.log('  JSON.stringify(await window.taskpilot.getSettings())');
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  Origin: serverUrl,
  Referer: serverUrl,
  Cookie: cookie,
};

// Cards that were wrongly moved to Done
const cards = [
  { cardId: "69bd6611eb98b31ae69b03ef", checkItemId: "69c152b0e294d498caae56f4" },
  { cardId: "69c153c7a9f45b058ab16866", checkItemId: "69c153d9569aec73e93dee8c" },
  { cardId: "69c154765e504e686a2c7f69", checkItemId: "69c1547e5f0a564033460f52" },
  { cardId: "69c15546e73fbdded9bdcead", checkItemId: "69c1557a4aed24a936264cd5" },
];

// Step 1: Uncheck all items
console.log("Unchecking items...");
for (const c of cards) {
  const res = await fetch(`${serverUrl}/api/trello/checklist`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ cardId: c.cardId, checkItemId: c.checkItemId, state: "incomplete" }),
  });
  if (res.ok) {
    console.log(`  ✓ Unchecked ${c.checkItemId} on card ${c.cardId}`);
  } else {
    console.log(`  ✗ Failed to uncheck ${c.checkItemId}: ${res.status}`);
  }
}

// Step 2: Move cards back
if (targetListId) {
  console.log(`\nMoving cards to list ${targetListId}...`);
  for (const c of cards) {
    const res = await fetch(`${serverUrl}/api/trello/move-card`, {
      method: "POST",
      headers,
      body: JSON.stringify({ cardId: c.cardId, listId: targetListId }),
    });
    if (res.ok) {
      console.log(`  ✓ Moved card ${c.cardId}`);
    } else {
      console.log(`  ✗ Failed to move card ${c.cardId}: ${res.status}`);
    }
  }
} else {
  // Show available lists so user can pick
  console.log("\nFetching board lists to help you pick the target list...");
  console.log("(Re-run with the target list ID as 3rd argument)\n");

  // We need a board ID. Let's get it from the cards endpoint.
  const boardsRes = await fetch(`${serverUrl}/api/trello/boards`, { headers });
  if (boardsRes.ok) {
    const boards = await boardsRes.json();
    for (const b of boards) {
      console.log(`Board: ${b.name} (${b.id})`);
    }
  }
}

console.log("\nDone!");
