Webmsg Webmail
==============

TODO
----

- [x] Save filters to config
- [x] Buton to apply filters on mailbox
- [ ] Automatically apply filters on mailbox when state changes
- [ ] Automatically filter Inbox e-mails at all time, have a progress bar
  somewhere visible.
- [ ] Optim : add a keyword to e-mails that did not match any filters and do not
  filter them again unless the filter config changed. Have a state id for config
  filters and when the config filters hash changes in config, remove the keyword
  to all messages.
- [x] Header navigation to navigate to other top-level mailboxes
- [ ] Header navigation: navigate to views for starred messages or workflow
  labels. Global configuration should tell if a label is specific to an
  individual mail or to a thread (any mail in the thread having the label causes
  the thread to have the label).
- [ ] default config
    - default mailboxes : important, hidden, shop, robot, news
    - default workflow labels: starred (standard IMAP), needs reply
- [ ] inbox filters: filters based on a the domain part of the address only
  (every local part will match)
- [ ] inbox: configure quick filters targets
- [ ] inbox: filtering to, cc and bcc addresses irrespectively
- [ ] inbox: quick filter button to put in Junk
- [ ] configure which mailboxes appear in header navigation and in which order,
  and for each mailbox if the number of unreads should be shown
- [ ] configure which mailbox should be the default when opening up the webmail
- [ ] Add view options for mailboxes
    - [ ] Add Blog view for a mailbox, and add a toolbar to select the current view
    - [ ] Add thread view to mailbox (similar to inbox but click takes you to the
          thread and there is no filter buttons)
- [ ] Create a thread page
    - [ ] Option to navigate to specific email
    - [ ] Option to navigate to first unread
    - [ ] collapse emails by default unless unread or focused
    - [ ] add reply box at the end and option to open the reply box under any
      specific email. Reply box can result in saved draft in thread or sent to
      other recipients.
    - [ ] add option to add to a specific mailbox
    - [ ] one click to mark a specific email as starred or other workflow labels
      configurable
    - [ ] show the list of people involved in a thread
        - the original list of recipient makes the members
        - later mails without all recipients are considered private replies and
          are shown as such clearly
        - later mails with all the thread members and another recipient
          generates an event "someone added to thread" shown as such between
          emails. If not all original recipients are included, this is instead
          labelled as a private reply
    - [ ] show the thread workflow labels at the top of the thread
    - [ ] for each email show the starred status and the mail specific workflow
      labels
    - [ ] show the list of mailboxes the threads belongs to, hide drafts and
      sent mailboxes
    - [ ] clicking a mailbox name the mail belongs to opens up a menu to move
      the thread to another mailbox instead
- [ ] Save in config which mailbox has which view
- [ ] Add options for how unreads are managed in a mailbox
    - [ ] unreads marked as read as soon as you enter the mailbox
    - [ ] unreads on top section, mark as read when opening thread in full page
    - [ ] reads and unreads mixed, mark as read when opening thread in full page
- [ ] Click an unread thread takes you to the first unread message and marks the
  thread as read
- [ ] add snooze option for mails


Documentation
-------------

- Hugo: https://gohugo.io/documentation/

Preview locally the app
-----------------------

*Note: With HCMS, the stylesheet oad order is different and some styles may be
different*

```
npm run dev
```

Preview locally the static website without the app
--------------------------------------------------

Start Hugo webserver and access the website at http://localhost:1313

```
hugo serve
```

