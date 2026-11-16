/* ── 劇場模式英文 overlay：EN 模式時以相同結構覆蓋 THEATER_NAMES / THEATER_SCENES 的顯示字串 ── */
// 只放含中文的字串欄位；結構（陣列 index、巢狀 key）與 84-theater-data.js 一一對應，數字／狀態欄位不動
if (EN) {
  const thDeepMerge = (target, src) => {
    if (target == null || src == null) return;
    for (const k of Object.keys(src)) {
      const v = src[k];
      if (v == null) continue;
      if (typeof v === 'string') target[k] = v;
      else if (typeof v === 'object' && target[k] != null && typeof target[k] === 'object') thDeepMerge(target[k], v);
    }
  };
  Object.assign(THEATER_NAMES, {"niche":"Niche Market","massS":"Mass Market · S","massN":"Mass Market · N","ent":"Enterprise"});
  thDeepMerge(THEATER_SCENES, [
   {
    "title": "\"We're understaffed. Hire more.\"",
    "sub": "The Boss's screen has no box for management bandwidth",
    "hook": "Plenty of cash, too few people → hire. On his screen, that logic is flawless.",
    "steps": [
     {
      "say": "Start with <b>the PM's screen</b>. Eighteen people, three queues backed up, Bandwidth at <b>26 / 28</b>. <em>Two more hires and the whole line grinds to a halt.</em>"
     },
     {
      "say": "Now switch off the PM layer — this is <b>what the Boss actually sees</b>. Four cards. No bandwidth, no queues, no tech debt."
     },
     {
      "say": "He sees cash at <b>1402</b>, headcount <b>18</b>, a green light. <em>Money in the bank means hire</em> — on this screen, there's nothing wrong with that logic.",
      "order": "We don't have enough people. Get the team to 24 this quarter."
     },
     {
      "say": "Turn both layers on. <b>The gap isn't skill. It's which fields you can see.</b> None of that amber info on the right has ever appeared on his screen."
     },
     {
      "say": "Three columns side by side: the Boss's four numbers, the Manager's four rollup metrics, the PM's twenty-odd boxes of detail. <b>The only thing connecting the two ends is someone in the middle willing to translate.</b>",
      "addSay": "The fourth column is the Engineer: all he knows is the ticket in front of him — nobody's even told him why we're hiring."
     }
    ],
    "ways": [
     {
      "t": "Route A · Build capacity first",
      "h": "Say yes — but flip the order",
      "b": "Approve the headcount, but spend week one's budget <b>on the Comms Layer first</b> (+8 ▤). When the new people arrive there's a seat for them — and output actually rises in week two.",
      "cost": "Cost: week one's delivery numbers will look even worse — so agree on that up front."
     },
     {
      "t": "Route B · Flag it early",
      "h": "Translate \"bandwidth\" into words he understands",
      "b": "Mark it red on the decision-point status report: <b>\"If we hire now, output won't rise for three weeks.\"</b> Don't say bandwidth, don't say supply block — talk about what's on his screen: time and numbers.",
      "cost": "Cost: zero. It's the only move in the game that stops the bleeding without spending a thing (the Trust hit drops from −12 to −4)."
     },
     {
      "t": "Route C · Subtract to make room",
      "h": "Don't add people — free up seats first",
      "b": "Retire a few low-value features and hand their bandwidth to the new hires. <b>The \"24 people\" target is reachable — just not through recruiting</b>.",
      "cost": "Cost: admitting some things were mistakes from the start — the hardest button in the whole game to press."
     }
    ],
    "S": {
     "milestone": "Q4 product launch",
     "eng": {
      "tickets": "3 queued",
      "order": "Take on more — new hires are coming",
      "feel": "Every desk is taken. I have to queue for a power outlet.",
      "sightNote": "outlets and desks",
      "say": "Who's onboarding the new hires? Nobody told me. I haven't even finished my three tickets."
     }
    }
   },
   {
    "title": "\"Why isn't it done yet?\"",
    "sub": "All three layers see output falling. None of them can see why.",
    "hook": "The more people you add, the further output falls. The answer here isn't discipline — it's observability.",
    "steps": [
     {
      "say": "The <b>Manager layer</b> speaks first: economic efficiency down to 53%, the Rival pulling ahead on power. He can see the <em>symptoms</em>."
     },
     {
      "say": "<b>Boss layer</b>: milestone on amber, cash sliding. His question is completely reasonable — his screen shows only outcomes, never the process.",
      "order": "We're two weeks behind. Why isn't this done yet?"
     },
     {
      "say": "Open the <b>PM layer</b>. You'd think the answer is finally here. <em>But this team has no QA and no Observability — even the PM can't see the cause.</em>",
      "engNote": "What the PM can't see without a detector, he trips over every single day. Nobody asks."
     },
     {
      "say": "Spend ●75 on one QA. <b>Seventeen red blocks instantly appear in your base.</b> They were there all along. Nobody could see them."
     },
     {
      "say": "Do the math: 17 pts of debt = −20% output efficiency + 0.51 leaking every second. <b>Paying it off takes just 170 engineer-seconds and earns itself back in about 36 s.</b> <em>Paying down debt always pays — the problem is that number isn't on your screen.</em>",
      "addSay": "Open one more layer: the Engineer. He's known all along where the slowdown is. Nobody ever asked."
     }
    ],
    "ways": [
     {
      "t": "Route A · Buy eyes first",
      "h": "Detectors before everything",
      "b": "When you have no way to detect anything, <b>don't start by guessing the cause</b>. A QA / SRE costs just ●75 — far cheaper than three weeks of flailing.",
      "cost": "Cost: this money ships no features, which makes it the hardest budget in the company to win — so bring numbers when you ask."
     },
     {
      "t": "Route B · Put debt paydown on the schedule",
      "h": "Never say the words \"tech debt\"",
      "b": "Tell the Boss: <b>\"Give me three people for two weeks, and we gain seven people's worth of capacity every week after.\"</b> Same thing — but it lands in fields that are on his screen (people, time, capacity).",
      "cost": "Cost: you have to be able to measure it first. Which means detectors first, again."
     },
     {
      "t": "Route C · Stop the bleeding",
      "h": "Stop crunching first",
      "b": "Drop the pace back to Normal. <b>Fast saves 28% of the time for +2 debt; Crunch saves another 17% and multiplies debt 2.5×</b> — that second gear is never worth it.",
      "cost": "Cost: one or two fewer deliveries this quarter. Say so at the decision point, up front."
     }
    ],
    "S": {
     "milestone": "Q3 delivery (2 weeks late)",
     "eng": {
      "tickets": "2 (both marked 'today')",
      "order": "This one has to be done today",
      "feel": "Every file I touch, I first have to work around hacks left over from crunch. Each ticket takes 30% longer.",
      "sightNote": "hacks left over from crunch",
      "say": "I've known where it's slow for ages — but nobody asked me, and I didn't know it was called 'tech debt'."
     }
    }
   },
   {
    "title": "\"They shipped it. Why haven't we?\"",
    "sub": "Two people talking about different things — just forty-seven seconds apart",
    "hook": "The Boss's competitor intel is sharp and comes with a conclusion. Yours is a snapshot from forty-seven seconds ago.",
    "steps": [
     {
      "say": "<b>Boss layer</b>: one crystal-clear competitor card — \"Competitor launches 'Real-time Collaboration'.\" <em>Source: a market report, untouched by any internal spin.</em>"
     },
     {
      "say": "Same spot on the <b>PM layer</b>: the Mass Market scouting snapshot is stamped <b>−470 s</b> and reads power 26. <em>Right now it's actually 41.</em>"
     },
     {
      "say": "Stack the two layers: <b>his info is newer than yours; yours is more detailed than his.</b> When you two argue, you're both right.",
      "order": "The competition already launched. Where are we?"
     },
     {
      "say": "Send two people to scout. The snapshot updates to <b>41</b>. <em>The cost is two people's mining time — which is exactly why research budget is so hard to win: it produces nothing. It just keeps you from flying blind.</em>"
     },
     {
      "say": "This is the box that matters: <b>the Boss knows the competitor better than his own company</b>. Competitor intel comes straight in from outside; yours has to climb three layers of reporting.",
      "addSay": "The fourth column is the Engineer: competitors, the argument, timestamps — he has none of it. His job is to finish the ticket."
     }
    ],
    "ways": [
     {
      "t": "Route A · Name the time gap",
      "h": "Align on time first, then on facts",
      "b": "\"What you saw is what they shipped <b>last week</b>; what I have is <b>today's</b> measurement.\" <em>Put the two timestamps side by side</em> and 80% of the argument evaporates on the spot.",
      "cost": "Cost: you actually need timestamps. So the scouting can't stop."
     },
     {
      "t": "Route B · Work back from his source",
      "h": "Use the market report as your calibration",
      "b": "Go read the same market report he read, then tell him <b>what the report left out</b> (how much they burned, what they skipped). You're not contradicting him — you're completing his picture.",
      "cost": "Cost: time spent reading the rival's public material. But it's the cheapest scouting there is."
     },
     {
      "t": "Route C · Make scouting routine",
      "h": "Make \"refresh the snapshot\" a fixed cost",
      "b": "Keep one or two people permanently on market and competitor tracking. <b>Not to make the call — but so everyone at the decision point is looking at the same map.</b>",
      "cost": "Cost: those one or two people's output. Looks expensive — until you price out \"charging in the wrong direction.\""
     }
    ],
    "S": {
     "milestone": "Q4 product launch",
     "headline": "Competitor launches \"Real-time Collaboration\"",
     "eng": {
      "tickets": "1 open",
      "order": "Build it to spec",
      "feel": "Competitors? No idea.",
      "say": "What are the Boss and the PM fighting about? I'm just here to close this ticket."
     }
    }
   },
   {
    "title": "\"Get us into Enterprise this quarter, too\"",
    "sub": "The prerequisites aren't on his screen",
    "hook": "He isn't giving reckless orders. \"You need a Platform Feature first\" simply doesn't exist in his view of the world.",
    "steps": [
     {
      "say": "<b>Boss layer</b>: competitor news + 17% market share + board meeting D−7. <em>The order is the inevitable result of those three numbers.</em>",
      "order": "The competition's moved into Enterprise. We're getting in this quarter too."
     },
     {
      "say": "<b>PM layer</b>: the Enterprise zone requires power 30, <b>plus a hard requirement of at least one Platform Feature</b> (compliance / SLA / SSO). <em>We have zero.</em>"
     },
     {
      "say": "A Platform Feature costs ●125 ◆50 and 32 s — and you need a Platform Team first (●150 ◆100, 60 s). <b>Just qualifying to get in takes a month and a half.</b>"
     },
     {
      "say": "This isn't about whether it can be done. <b>His screen simply has no such thing as a \"prerequisite.\"</b> You can't answer him with a no — answer him with a <em>timeline</em>."
     },
     {
      "say": "Flag it red at the decision point — \"No Platform Feature, no Enterprise\": <b>you still take the order, but a miss costs −4 Trust instead of −12.</b> <em>It won't get anything done a day sooner, but it's the only move that costs nothing.</em>",
      "addSay": "Open one more layer: the Engineer. \"Why SSO?\" — nobody has ever explained that to him."
     }
    ],
    "ways": [
     {
      "t": "Route A · Accept it, in two phases",
      "h": "Turn \"get in this quarter\" into \"qualify this quarter\"",
      "b": "This quarter, deliver <b>a Platform Feature + one enterprise pilot</b>; market share is next quarter's conversation. You've handed him progress he can show the board — without promising the impossible.",
      "cost": "Cost: your Mass Market push slows a beat, and the Rival may grab a zone while you're busy."
     },
     {
      "t": "Route B · Offer another path",
      "h": "Same goal, cheaper play",
      "b": "\"Enterprise will take us a month and a half — but the same revenue from <b>Mass Market · S takes just three weeks, starting now</b>.\" Offering an alternative is a hundred times more useful than just saying no.",
      "cost": "Cost: you have to run the numbers first. An alternative you haven't done the math on sounds like an excuse."
     },
     {
      "t": "Route C · Trade resources for time",
      "h": "Take it on — but spell out the price",
      "b": "\"We can get in this quarter if I pull two people off upkeep — the price is slower response to existing customers' issues. <b>Your call.</b>\" Hand the trade-off back to the person with the authority to make it.",
      "cost": "Cost: if he picks it, you really do own the consequences. So spell it out up front, not after the fact."
     }
    ],
    "S": {
     "milestone": "Board meeting D−7",
     "headline": "Competitor announces move into Enterprise",
     "eng": {
      "tickets": "2 SSO-related",
      "order": "Get SSO built first",
      "feel": "Why SSO? Nobody's explained.",
      "sightNote": "SSO prereqs not scheduled",
      "say": "They say we're going after Enterprise, but nobody's scheduled the platform piece. All I can see is my own ticket."
     }
    }
   },
   {
    "title": "\"Upkeep's too expensive. Cut costs.\"",
    "sub": "Twenty-two live features are eating your team alive",
    "hook": "The more features you ship, the more your team becomes caretakers of old stuff — and nobody ever announced the shift.",
    "steps": [
     {
      "say": "<b>PM layer</b>: 22 live features, Bandwidth <b>34 / 36</b>, upkeep eating 1.52 per second. <em>Net income is already negative — you're slowly bleeding out.</em>"
     },
     {
      "say": "Each feature takes 1 ▤ and drains budget nonstop, and <b>complexity multiplies — it doesn't add</b> (×1.73). <em>Sixteen features eat roughly the entire output of one and a half engineers.</em>"
     },
     {
      "say": "The <b>Boss layer</b> shows only cash at 210 and falling, and a red light. His direction is <b>right</b> — the number \"two\" is just a guess.",
      "order": "Upkeep's too expensive. Cut two features this quarter."
     },
     {
      "say": "Retire <b>8</b>. Bandwidth frees up, upkeep drops, <em>net income flips positive</em>. The hard part isn't knowing what to cut — it's admitting those things were mistakes."
     },
     {
      "say": "Notice how the three columns differ: the Boss sees <b>cash stop falling</b>, the Manager sees <b>economic efficiency recover</b>, you see <b>eight more slots of bandwidth</b>. <em>One action, three languages. Pitch it in the one he speaks.</em>",
      "addSay": "The fourth column is the Engineer: he knows which features nobody uses. Nobody asks him."
     }
    ],
    "ways": [
     {
      "t": "Route A · Retire proactively",
      "h": "Act before anyone asks",
      "b": "Audit regularly and take the least-used batch straight offline. <b>You get zero refund, but the bleeding stops immediately and bandwidth frees up.</b> <em>It's the most counterintuitive button in the game — and the one most worth practicing.</em>",
      "cost": "Cost: someone will be unhappy (including whoever built it). So bring numbers, not feelings."
     },
     {
      "t": "Route B · Say complexity in one sentence",
      "h": "\"Right now, one and a half people do nothing but babysit old stuff\"",
      "b": "Don't talk upkeep costs, don't talk technical complexity. <b>Convert it into people</b>: his screen has a \"headcount\" box, so put your answer in that box.",
      "cost": "Cost: you have to be able to calculate it first. Which is one more reason you need observability."
     },
     {
      "t": "Route C · Turn off the tap first",
      "h": "\"Stop adding\" is an easier sell than \"cut the old\"",
      "b": "If you can't cut, at least make sure <b>you add features slower than you retire them</b>. Get the direction right and time works for you.",
      "cost": "Cost: it's slow. And as long as the feature count keeps growing, your bandwidth stays tight."
     }
    ],
    "S": {
     "milestone": "End-of-quarter cash",
     "eng": {
      "tickets": "5 legacy fixes",
      "order": "Fix this bug today",
      "feel": "Half my time goes to fixing old features. Out of 22, I really know maybe 6.",
      "sightNote": "legacy modules nobody dares touch",
      "say": "Cut features? We've wanted to for ages — nobody asked me which ones no one uses."
     }
    }
   },
   {
    "title": "Winning every fight, losing market share",
    "sub": "You won every skirmish and lost the map",
    "hook": "When the Rival's distribution costs nothing, how big does your product edge need to be? Do that math first.",
    "steps": [
     {
      "say": "<b>PM layer</b>: look at the power bars at each zone — us 50, Rival 26. <em>Head to head, you win two to one.</em>"
     },
     {
      "say": "But across the whole map, <b>three zones belong to the Rival</b>. And two of them <em>you never even fought for</em> — its ecosystem simply absorbed them."
     },
     {
      "say": "The <b>Manager layer</b> can see the curves cross: our power line flat, the Rival's climbing steadily. <em>He can see the gap widening, but not where it comes from.</em>"
     },
     {
      "say": "The <b>Boss layer</b> has one number: 17% market share, red light. <em>His question is entirely fair — and it takes all three layers together to piece the answer together.</em>",
      "order": "Market share went from 50% to 17%. What happened?"
     },
     {
      "say": "The answer: <b>you won on product and lost on distribution.</b> Winning more head-to-head fights won't help — the real fight is <em>distribution</em>, or shifting resources from units to <em>upgrades</em> (global, compounding, and only visible mid-game).",
      "addSay": "Open one more layer: the Engineer. To him, \"winning every fight\" is enough — distribution isn't in his line of sight."
     }
    ],
    "ways": [
     {
      "t": "Route A · Fight for distribution",
      "h": "Don't out-build them — out-distribute them",
      "b": "Shift effort from \"20% better\" to <b>integrations, embedding, channel partnerships</b>. The Rival spreads for free because it's bundled into something people already paid for — you can find one too.",
      "cost": "Cost: it's a completely different capability — maybe new people, a new org. Six months, minimum."
     },
     {
      "t": "Route B · Invest in upgrades, not units",
      "h": "Compounding only shows mid-game",
      "b": "Put 60% of your resources into <b>global upgrades</b> (fulfillment, automation, process). For the first eight minutes you'll be the weaker side — <em>which is exactly when most people give up</em>.",
      "cost": "Cost: the mid-game numbers will look ugly. You have to borrow that stretch of time from the Boss up front."
     },
     {
      "t": "Route C · Pull back to what you can hold",
      "h": "Not every zone is worth defending",
      "b": "Give up the Mass Market and concentrate all your power on Niche + Enterprise. <b>Your map is the ground that's hard to take from you.</b>",
      "cost": "Cost: market share looks even worse short-term. Spell this route out at the decision point beforehand, or it'll be read as a rout."
     }
    ],
    "S": {
     "milestone": "Q4: hold market share",
     "headline": "Competitor bundles its product free into an existing suite",
     "eng": {
      "tickets": "2 open",
      "order": "Make this better",
      "feel": "Our features are clearly better than theirs",
      "say": "But we win every fight. Distribution? That's someone else's problem."
     }
    }
   }
  ]);
}
