# Lessons

## How to scope your first intent on a big project

1. **Don't spec everything.** Keep one short, high-level product intent: the problem, the users, the long-term vision and the big constraints. Then write one detailed intent for each slice you build. A big spec goes stale quickly and is hard to keep in your head.
2. **Find the core loop.** Ask what one thing the product must do for someone to get value. Start there.
3. **Pick a slice that:**
   - is useful on its own,
   - tests the riskiest part of the idea,
   - is something later features will build on, and
   - you can build and test end to end.
4. **Cut hard.** Sort ideas into must-have, later and different-product. Write down what's out ("Not in the MVP") so it doesn't creep in.
5. **Test it with one sentence:** "A [specific person] can [do one core thing] so that [result]." If it takes more than one sentence, the slice is too big.
6. **Let the agent interview you.** Try:

   > I have a big project in mind: [describe it]. Interview me, one question at a time, to find the smallest useful first slice. Then draft docs/intent.md for it.

Detail what you're building next, and only sketch what comes after.

## Useful prompts and skills

- `/agent-skills:idea-refine`: narrows a vague, big idea into something sharp.
- `/agent-skills:interview-me`: asks one question at a time until your real intent is clear.
- `/agent-skills:plan`: breaks an intent into small tasks with acceptance criteria and dependency order.
- `/agent-skills:build`: implements one task at a time, tests it and commits it.

Plain planning prompt:

> Read docs/intent.md, docs/TECH_STACK.md and docs/BRAND.md. Then write a build plan for the MVP in docs/PLAN.md. Break the work into small, ordered tasks, each one something I can build and verify on its own. For each task give what it delivers, acceptance criteria and dependencies on earlier tasks. Don't write any code yet. Ask me about anything that's unclear before you finalize the plan.
