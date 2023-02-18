Webmsg Webmail
==============

TODO
----

- [x] Save filters to config
- [ ] Button to apply filters on a given e-mail
- [ ] Buton to apply filters on mailbox
- [ ] Successfully filtered mail gets removed from the current mailbox, unless
  it should be in this mailbox as per the filters. Mails that do not match any
  filters stays in the current mailbox
    - first, have a loader that tells "Getting the list of e-mails from the
      server". If the query is too large, get the total number of results from
      the server
    - then, when we have the total number of e-mails from the first request,
      have a progress bar that shows the number of e-mails filtered
    - have a stop button to stop filtering
- [ ] Automatically apply filters on mailbox when state changes
- [ ] Automatically filter Inbox e-mails at all time, have a progress bar
  somewhere visible.
- [ ] Optim : add a keyword to e-mails that did not match any filters and do not
  filter them again unless the filter config changed. Have a state id for config
  filters and when the config filters hash changes in config, remove the keyword
  to all messages.
- [ ] Header navigation to navigate to other top-level mailboxes
- [ ] Add Blog view for a mailbox, and add a toolbar to select the current view
- [ ] Save in config which mailbox has which view
- [ ] Add thread view to mailbox (similar to inbox but click takes you to the
  thread and there is no filter buttons)
- [ ] Add option to view unread on top in thread view
- [ ] Click an unread thread takes you to the first unread message and marks the
  thread as read


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

