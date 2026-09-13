# How do mainstream shared work-queue / ticketing / code-review systems handle claiming a pool item that any qualified worker may pick up?

**Asked by:** Ticket #62, "Does the reviewer queue need a claim, and there the contention argument is real"
**Date:** 2026-09-11
**Status of sources:** Checked each cited page live on 2026-09-11 against the vendor's current official documentation domain (docs.aws.amazon.com, support.zendesk.com, support.atlassian.com, docs.github.com, gerrit-review.googlesource.com). None of these are versioned standards documents with a "superseded" concern the way FDA/NIST guidance is; I treat "current live page on the vendor's own docs domain" as the currency check for software documentation. Ticket #47's Camunda "task-claim" citation is not re-examined here per the task instructions.

## Findings

### 1. AWS SQS — visibility timeout (message-queue lease pattern)

- **Mechanism:** "When you receive a message from an Amazon SQS queue, it remains in the queue but becomes temporarily invisible to other consumers. This invisibility is controlled by the visibility timeout, which ensures that other consumers cannot process the same message while you are working on it." — [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- **Default duration:** 30 seconds. **Configurable range:** the same page states a per-message or per-queue timeout can be set, and the "Best practices" section states a hard ceiling: "the visibility timeout has a maximum limit of 12 hours from when the message is first received. Extending the timeout doesn't reset this 12-hour limit."
- **Expiry behavior — automatic reclaim, not explicit release:** "The visibility timeout starts as soon as a message is delivered to you. During this period, you're expected to process and delete the message. If you don't delete it before the timeout expires, the message becomes visible again in the queue and can be retrieved by another consumer." This is timeout-based automatic reclaim; explicit release is also supported (`ChangeMessageVisibility` with `VisibilityTimeout=0` "immediately makes the message available for other consumers to process").
- **Hard block or advisory?** This is the one system in this set that is a **real technical enforcement**, not merely a visible marker: while the timeout is running, the message is not returned to any other consumer that calls `ReceiveMessage`. However, the same page is explicit that this is not an absolute guarantee: "due to the at-least-once delivery model of Amazon SQS, there's no absolute guarantee that a message won't be delivered more than once during the visibility timeout period." So even the strongest lock mechanism found is documented as probabilistic, not a strict mutex.
- **Stranding fallback:** if the holder crashes or never deletes the message, the timeout always expires and the message becomes available again — there is no code path in the documented behavior by which a message can be claimed and then permanently stranded; the page also documents Dead-Letter Queues as an escape valve for messages that fail processing repeatedly.

### 2. Zendesk — "take it" ticket assignment

- **Mechanism, quoted verbatim:** "If the ticket is currently assigned to a group you don't belong to, clicking **take it** assigns it to you in your default group. If you are a group member, the ticket is assigned to you and remains with the current group." — [Manually assigning a ticket](https://support.zendesk.com/hc/en-us/articles/4408887127450-Manually-assigning-a-ticket)
- **Hard block or advisory?** The documentation only describes the mechanics of writing the Assignee field. **It does not state anywhere on this page that assignment prevents another agent from opening, editing, or replying to the same ticket.** I could not find, on this page or its immediate documentation siblings, any statement that "take it" enforces exclusivity — it reads as a visible-marker/coordination field, but I want to flag this as an absence of a "no lock" statement rather than a confirmed "no lock" statement; Zendesk's docs simply do not address the concurrent-access question either way.
- **Timeout/auto-release:** Not documented on this page. No mention of any automatic reassignment or release if the assignee does nothing.

### 3. Jira Service Management — "Assign to me" from a queue

- **Mechanism, quoted verbatim:** "Agents will generally work out of queues that automatically assign issues to them. However, sometimes you might need to manually assign issues to agents," done by selecting the Assignee field and choosing "Assign to me." — [Assign an issue to an agent](https://support.atlassian.com/jira-service-management-cloud/docs/assign-an-issue-to-an-agent/)
- **Hard block or advisory?** Same finding as Zendesk: the documentation describes only the mechanics of the Assignee field. It does not state whether assignment technically restricts other agents from acting on the issue, and does not mention any enforcement, automatic unassignment, or timeout. This is a **documentation gap**, not a confirmed absence of enforcement.

### 4. Gerrit — Attention Set (closest analogue to a reviewer queue)

- **Mechanism, quoted verbatim:** "For every change Gerrit maintains an 'Attention Set' with users that are currently expected to act on the change. This is expressed by an arrow icon before a (bolded) user name on the dashboard and change page." — [Gerrit Code Review – Attention Set](https://gerrit-review.googlesource.com/Documentation/user-attention-set.html)
- **Hard block or advisory — explicit:** the documentation is entirely about who is *expected* to act, and about UI display, not about access control. It never states that being in or out of the attention set changes what a user is permitted to do to the change (comment, vote, submit). This is documented as a **pure visibility/expectation-tracking mechanism with no technical enforcement** found in the page.
- **Timeout / stranding fallback — social, not automatic:** "Reviewers are expected to respond in a timely manner when it is their turn, and if you don't plan to respond within ~24h, then you should either remove yourself from the attention set or send a clarification message to the change owner." This is a documented **norm**, not a system-enforced timeout — the removal is a manual, self-directed or owner-directed action. The one automatic job the docs describe re-adds the *change owner* to the attention set on long-inactive open changes; it does not re-add or reassign an unresponsive *reviewer*, and does not release or reassign a change to a different reviewer.

### 5. GitHub — pull request "Request a review"

- **Mechanism, quoted verbatim:** "you can request a review from a person or team with read access to the repository, and they receive a notification." — [Requesting a pull request review](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/requesting-a-pull-request-review)
- **Hard block or advisory?** The page documents requesting a review as producing a notification, not an exclusive claim; it does not state that a requested reviewer's status blocks anyone else from reviewing or merging (multiple people can review/comment on a GitHub PR regardless of who was requested). I found no statement on this page addressing exclusivity either way, and no statement about what happens if a requested reviewer never responds — the page documents only that a review can be "re-requested" after changes are made, with no automatic reassignment, timeout, or release language.

## What I could not establish

- Whether Zendesk's or Jira Service Management's "assign"/"take it" mechanisms have any technical enforcement (e.g., blocking a second agent's edit, or a warning banner) — their public documentation does not address concurrent-access behavior at all. This may exist as a UI courtesy behavior undocumented in these pages, or may not exist; the primary sources do not settle it.
- Whether GitHub technically restricts anything at all based on reviewer-request status beyond notification routing and (separately, under branch-protection rules not covered by the page I fetched) required-approval counts; the page fetched does not describe branch protection interactions.
- Whether Gerrit's attention set has any interaction with actual write/vote permissions elsewhere in its permission model; the Attention Set doc itself states none.
- None of the five systems examined documents a case where a claim/assignment is a **permanent, unrecoverable strand** with no fallback of any kind — SQS has automatic timeout reclaim, Gerrit has a documented social norm plus manual removal, and Zendesk/Jira/GitHub simply don't document a locking mechanism whose absence would need a fallback. I could not find a documented system, in or out of this set, where a claimed item is asserted to be permanently unrecoverable.

## Sources

- Amazon Web Services, "Amazon SQS visibility timeout," AWS SQS Developer Guide, live page fetched 2026-09-11: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
- Amazon Web Services, `ChangeMessageVisibility` API reference, live page fetched 2026-09-11: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ChangeMessageVisibility.html
- Zendesk, "Manually assigning a ticket," Zendesk Support Help Center, live page fetched 2026-09-11: https://support.zendesk.com/hc/en-us/articles/4408887127450-Manually-assigning-a-ticket
- Atlassian, "Assign an issue to an agent," Jira Service Management Cloud documentation, live page fetched 2026-09-11: https://support.atlassian.com/jira-service-management-cloud/docs/assign-an-issue-to-an-agent/
- Google/Gerrit, "Gerrit Code Review – Attention Set," live page fetched 2026-09-11: https://gerrit-review.googlesource.com/Documentation/user-attention-set.html
- GitHub, "Requesting a pull request review," GitHub Docs, live page fetched 2026-09-11: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/requesting-a-pull-request-review
