# Google Stitch MCP Setup Guide

## Setup Instructions

### 1. Set Environment Variable

Create `.env.local` in project root:
```bash
GOOGLE_STITCH_API_KEY=your-new-api-key-here
```

Add to `.gitignore`:
```
.env.local
.env.*.local
```

### 2. Configure MCP Server

Add to `~/.claude/settings.json`:
```json
{
  "mcpServers": {
    "stitch": {
      "transport": "http",
      "url": "https://stitch.googleapis.com/mcp",
      "headers": {
        "X-Goog-Api-Key": "${GOOGLE_STITCH_API_KEY}"
      }
    }
  }
}
```

### 3. Verify Connection

```bash
# Load the env var
source .env.local

# Test MCP connection (in Claude Code)
# The Stitch tools should now be available via MCP
```

### 4. Available Stitch Operations

Once configured, you can use Stitch to:
- ✅ Create data sources
- ✅ Define transformations
- ✅ Sync data to destinations
- ✅ Monitor data pipelines
- ✅ Manage integrations

## Integration with Tutorera

### Data Models to Sync via Stitch

1. **Tutors**
   - Profile data
   - Availability
   - Ratings/reviews
   - Specializations

2. **Students**
   - Profile data
   - Learning history
   - Progress tracking
   - Preferences

3. **Bookings**
   - Session details
   - Payment info
   - Ratings/feedback
   - History

4. **Offers**
   - Bid details
   - Counter-offers
   - Messages
   - Status tracking

### Screen Components Using Stitch

- Tutor Discovery (read tutors via Stitch)
- Student Dashboard (sync progress)
- Booking Management (write bookings to Stitch)
- Analytics Dashboard (aggregate data from Stitch)

## Security

- ✅ API key in `.env.local` (not in code)
- ✅ `.env.local` in `.gitignore`
- ✅ Header injection via MCP
- ✅ No key in git history

## Testing Stitch Connection

```bash
# Verify MCP server is accessible
curl -H "X-Goog-Api-Key: $GOOGLE_STITCH_API_KEY" \
  https://stitch.googleapis.com/mcp/health
```

## Next Steps

1. ✅ Verify API key is set
2. ✅ Test Stitch connection
3. ✅ Design screens using Stitch data
4. ✅ Integrate into app
5. ✅ Monitor data pipelines

---

**Status:** MCP Configuration Ready ✅
