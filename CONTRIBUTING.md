# Contributing

TODO: Fill out in more detail. Some notes:

4 major steps of the code:

1. Parse input and build context
2. Parse results and build report (invokeBuildReport)

   - The original intention of having a separate "build report" routine and
     "updating comment" routine was to support the GitHub checks API, but since
     that has been removed for now, perhaps is unnecessary

3. Acquire comment lock
4. Create or update comment HTML

Acquiring comment lock uses a state machine. See comments in comments.js for details

2 entry points to the action:

1. reportTachRunning

   - Used to create or update a comment that includes details about the currently
     running job. Useful so someone viewing the PR can know that benchmarks are
     currently running and new results will be reported soon. I find this
     important to know so that someone who is waiting for results (that may take
     10 minutes to come through) knows they are not looking at the new results of
     their latest change. Without this indication it may be hard to know if the
     results are from a previous run or the latest run.

   - This function runs a pre action to ensure that the "running" status is
     reported before benchmarks are ran.

2. reportTachResults

   - This function is the actual body of the action that reads the JSON output of
     a Tachometer run and creates or updates the corresponding comment.

## Publishing a new version

1. Update package.json with new version
   - This is read and burned into the build output. It is used to separate
     breaking changes in the comment HTML.
2. Check in package.json version change with commit message (e.g. "Release 2.1.0")
3. Create release in GitHub with notes on changes
4. Check out new tag (e.g. "v2.1.0")
5. Move major version to new tag (e.g. "v2"):
   - `git push origin :refs/tags/<tagname>; git tag -fa <tagname>; git push origin master --tags`
   - Message for major tag should be something like `Latest release of the v2 line`
