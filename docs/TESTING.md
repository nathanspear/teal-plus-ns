# Testing Guide for v0.8.0

## Quick Test Steps

### 1. Reload Extension
```
1. Go to chrome://extensions/
2. Find "Teal+"
3. Click refresh icon 🔄
4. Confirm version shows: 0.8.0
```

### 2. Prepare Test Page
```
1. Go to app.tealhq.com
2. Navigate to a resume
3. Make sure you have several checkboxes checked in:
   - Skills section
   - Certifications section
   - Publications section
   - Any other sections
```

### 3. Open Console (IMPORTANT)
```
1. Press F12 (Windows/Linux) or Cmd+Option+I (Mac)
2. Go to Console tab
3. Clear console (click 🚫 icon or Ctrl+L)
4. Keep it open during the test
```

### 4. Run Extension
```
1. Click "Auto OFF" button (bottom right)
2. Watch the progress overlay
3. Observe the console logs
```

### 5. Verify Results

#### Check Progress Messages
You should see (in order):
- ✓ "Opening all sections..."
- ✓ "Counting checkboxes..."
- ✓ "Processing skills..."
- ✓ "Processing interests..."
- ✓ "Processing certifications..."
- ✓ "Processing projects..."
- ✓ "Processing activities..."
- ✓ "Processing publications..."
- ✓ "Processing extra checkboxes..."
- ✓ Success toast message

#### Check Console Output
Look for these log patterns:
```
[Accordion] Opening section: skills
[Accordion] Section skills opened (visible)
[Checkboxes] Querying section: skills, firstPass: true
[Checkboxes] Section skills: 18 checked checkboxes to process
[Processing] skills: Unchecking "JavaScript" (checked)
[Processing] skills: "JavaScript" result: changed=true
```

#### Check Final Summary
Should see two console groups:
```
🚀 Auto-OFF Performance Metrics
  ├─ Total execution time: ~35000ms
  ├─ Total checkboxes processed: X
  ├─ Success rate: 95-99%
  └─ Average time per checkbox: ~280ms

📊 Results by Section
  ├─ skills: 18/18 changed
  ├─ certifications: 5/5 changed
  └─ publications: 3/3 changed
```

#### Verify Checkboxes
Manually check each section:
- [ ] Skills - all unchecked?
- [ ] Interests - all unchecked?
- [ ] Certifications - all unchecked?
- [ ] Projects - all unchecked?
- [ ] Activities - all unchecked?
- [ ] Publications - all unchecked?

## Test Scenarios

### Test 1: Normal Run
**Setup:** Check 10-20 items across multiple sections
**Expected:** All items unchecked, success rate >95%
**Time:** 30-45 seconds

### Test 2: Large Resume
**Setup:** Check 50+ items across all sections
**Expected:** All items unchecked, success rate >95%
**Time:** 60-90 seconds

### Test 3: Specific Section
**Setup:** Check only Skills items (20+)
**Expected:** All skills unchecked, other sections processed but show "0 checkboxes"
**Time:** 30-40 seconds

### Test 4: Empty Resume
**Setup:** Uncheck everything first
**Expected:** Runs quickly, shows "0 checkboxes to process" for all sections
**Time:** 10-15 seconds

### Test 5: Second Run
**Setup:** Run extension twice in a row
**Expected:** First run unchecks items, second run finds nothing to uncheck
**Time:** First 30-45s, Second 10-15s

## What to Look For

### ✅ Good Signs
- Sections processed in order: skills → interests → certifications → projects → activities → publications
- Console shows each section being opened
- Each section reports found checkboxes
- Success rate 95%+
- All checked items become unchecked
- No JavaScript errors in console

### ⚠️ Warning Signs
- Section shows "not found" → Section ID might have changed
- Section shows "0 checkboxes" when you know there are some → Checkbox detection issue
- Success rate <90% → Some checkboxes not responding to clicks
- Many "timeout" results → Need to increase wait times

### ❌ Problems
- Extension doesn't start → Reload extension
- Sections skip randomly → NOT FIXED, report with console logs
- Some checkboxes stay checked → Check preserve list, report with console logs
- Console errors → Report full error message

## Debugging

### If Something Goes Wrong

1. **Copy Console Output**
   ```
   Right-click in console → Save as... → debugging.log
   ```

2. **Note Which Section Failed**
   ```
   Example: "Skills section processed but 5 items stayed checked"
   ```

3. **Check Success Rate**
   ```
   If <90%, something is wrong
   If 95-99%, this is normal (some items may resist)
   If 100%, perfect!
   ```

4. **Try Again**
   ```
   Sometimes Teal app is slow to respond
   Refresh page and try again
   ```

## Performance Benchmarks

### Expected Timing (per section)
- Skills: 5-10 seconds (usually many items)
- Interests: 2-5 seconds
- Certifications: 2-5 seconds (fewer items)
- Projects: 5-10 seconds (many items)
- Activities: 2-5 seconds
- Publications: 2-5 seconds (fewer items)

### Total Expected Time
- Small resume (20-30 items): 20-30 seconds
- Medium resume (50-80 items): 35-50 seconds
- Large resume (100+ items): 60-90 seconds

## Reporting Issues

### What to Include
1. Console output (all logs from start to finish)
2. Which sections failed
3. How many items were checked before
4. How many items stayed checked after
5. Success rate from metrics
6. Browser version
7. Operating system

### Where to Report
Include in feedback with:
- Subject: "v0.8.0 - [Brief description]"
- Full console output
- Steps to reproduce
- Screenshots if helpful

## Quick Command Reference

### Console Commands (run in browser console)
```javascript
// Check current version
window.__autoOffLoaded

// View all sections defined
console.log(['skills', 'interests', 'certifications', 'projects', 'activities', 'publications'])

// Clear console
console.clear()

// Force reload extension content script
location.reload()
```

## Success Criteria

For v0.8.0 to be considered working correctly:
- ✅ All sections process in predictable order
- ✅ No sections randomly skipped
- ✅ Success rate >95% on normal resumes
- ✅ Console logs show clear progression
- ✅ Skills section always processes (was main issue)
- ✅ Results reproducible (same result on multiple runs)

## Known Limitations

1. **Slower than before** - This is intentional for reliability
2. **Can't process hidden sections** - Must be visible on page
3. **May miss dynamic content** - If Teal loads content after our wait times
4. **No parallel processing** - Sequential is more reliable but slower

## Next Steps After Testing

If tests pass:
- ✅ Use normally
- ✅ Report any issues with console logs
- ✅ Provide feedback on timing (too slow?)

If tests fail:
- ❌ Capture console output
- ❌ Note which sections failed
- ❌ Try increasing wait times in code
- ❌ Report detailed issue

