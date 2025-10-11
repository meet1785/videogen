# n8n Integration Guide

Complete guide for integrating VideoGen with n8n for automated content creation.

## Table of Contents
- [Quick Start](#quick-start)
- [Setup](#setup)
- [Workflow Examples](#workflow-examples)
- [Use Cases](#use-cases)
- [Troubleshooting](#troubleshooting)

## Quick Start

1. **Start VideoGen service:**
```bash
docker-compose up -d
```

2. **Import the example workflow into n8n:**
   - Open n8n
   - Go to Workflows → Import from File
   - Select `examples/n8n_workflow.json`
   - Save the workflow

3. **Test the workflow:**
```bash
curl -X POST "http://your-n8n-url:5678/webhook/video-request" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A peaceful mountain landscape at sunset",
    "platform": "instagram",
    "duration": 5
  }'
```

## Setup

### Prerequisites

- VideoGen service running (see main README)
- n8n instance (self-hosted or cloud)
- Network connectivity between n8n and VideoGen

### Configuration

1. **Update VideoGen URLs in n8n:**

In each HTTP Request node, update the URL to point to your VideoGen instance:
```
http://your-videogen-host:8000/api/v1/generate
```

2. **Add Authentication (Optional):**

If you've enabled API authentication in VideoGen:
- Go to Credentials in n8n
- Add new Header Auth credential
- Set Header Name: `X-API-Key`
- Set Header Value: Your API key
- Apply to all VideoGen HTTP Request nodes

## Workflow Examples

### 1. Basic Video Generation

**Flow:** Webhook → Generate Video → Wait → Check Status → Download

```json
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook"
    },
    {
      "name": "Generate Video",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://localhost:8000/api/v1/webhook/n8n",
        "method": "POST",
        "body": {
          "prompt": "={{ $json.prompt }}",
          "platform": "={{ $json.platform || 'instagram' }}",
          "duration": "={{ $json.duration || 5 }}"
        }
      }
    }
  ]
}
```

### 2. Scheduled Content Creation

**Flow:** Cron → Generate Prompt → Generate Video → Upload to Social Media

**Schedule:** Daily at 9 AM

```
Cron Node → Function (Generate Prompt) → HTTP Request (VideoGen) → Wait → Check Status → Upload
```

**Function Node (Generate Prompt):**
```javascript
const prompts = [
  "A beautiful sunrise over the city",
  "Peaceful ocean waves at sunset",
  "Mountain landscape with fog",
  "City lights at night",
  "Forest path in autumn"
];

const today = new Date().getDay();
const prompt = prompts[today % prompts.length];

return {
  json: {
    prompt: prompt,
    platform: "instagram",
    duration: 5
  }
};
```

### 3. RSS to Video

**Flow:** RSS Feed → Extract Content → Generate Video → Post to Social Media

```
RSS Read → Function (Extract) → HTTP Request (VideoGen) → Wait → Upload to Instagram
```

**Function Node (Extract Content):**
```javascript
const items = $input.all();
const videos = [];

for (const item of items) {
  const title = item.json.title;
  const description = item.json.description;
  
  videos.push({
    prompt: `${title}. ${description}. Cinematic style, high quality.`,
    platform: "youtube_shorts",
    duration: 10,
    metadata: {
      title: title,
      source: item.json.link
    }
  });
}

return videos;
```

### 4. AI-Powered Content Pipeline

**Flow:** Generate Topics → Create Scripts → Generate Videos → Publish

```
OpenAI (Topics) → OpenAI (Scripts) → VideoGen → Wait → Social Media
```

**OpenAI Node (Generate Topics):**
```
System: You are a content strategist for social media.
User: Generate 3 trending video topics for Instagram Reels about technology.
```

**OpenAI Node (Create Scripts):**
```
System: You are a video script writer. Create a 30-second video prompt.
User: Create a visual description for: {{ $json.topic }}
```

### 5. Multi-Platform Publishing

**Flow:** Generate Once → Adapt for Each Platform → Upload

```
HTTP Request (VideoGen Default) → Split in Batches → 
  ├─ HTTP Request (Instagram Format) → Upload Instagram
  ├─ HTTP Request (YouTube Shorts) → Upload YouTube
  └─ HTTP Request (YouTube Regular) → Upload YouTube
```

### 6. User Request System

**Flow:** User Submits Form → Queue Request → Generate → Notify User

```
Webhook/Form → Store in Database → Cron (Process Queue) → VideoGen → Email/SMS Notification
```

## Detailed Workflow: Complete Automation

### Workflow Structure

```
1. [Cron] - Triggers daily at 9 AM
     ↓
2. [OpenAI] - Generates topic ideas
     ↓
3. [OpenAI] - Creates detailed prompts
     ↓
4. [Function] - Formats for VideoGen
     ↓
5. [HTTP Request] - Calls VideoGen
     ↓
6. [Wait] - Waits 15 seconds
     ↓
7. [HTTP Request] - Checks status
     ↓
8. [IF] - Is video ready?
     ├─ Yes → [HTTP Request] - Download video
     │         ↓
     │        [Instagram] - Upload to Instagram
     │         ↓
     │        [Slack] - Send notification
     │
     └─ No → [Wait] - Wait 10 more seconds
              ↓
              (Loop back to step 7)
```

### Node Configuration

**1. Cron Node:**
```json
{
  "mode": "everyDay",
  "hour": 9,
  "minute": 0
}
```

**2. OpenAI Node (Topics):**
```json
{
  "operation": "message",
  "text": "Generate 3 trending topics for Instagram Reels about technology, innovation, or startups. Return only the topics, one per line."
}
```

**3. OpenAI Node (Prompts):**
```json
{
  "operation": "message",
  "text": "Create a detailed visual description for a 5-second video about: {{ $json.topic }}. Describe scenes, colors, movement, and atmosphere. Make it cinematic and engaging."
}
```

**4. Function Node:**
```javascript
// Format for VideoGen
return {
  json: {
    prompt: $json.prompt,
    platform: "instagram",
    duration: 5,
    seed: Math.floor(Math.random() * 1000000),
    guidance_scale: 7.5
  }
};
```

**5. HTTP Request Node (Generate):**
```json
{
  "method": "POST",
  "url": "http://localhost:8000/api/v1/webhook/n8n",
  "body": {
    "prompt": "={{ $json.prompt }}",
    "platform": "={{ $json.platform }}",
    "duration": "={{ $json.duration }}"
  }
}
```

**6. Wait Node:**
```json
{
  "amount": 15,
  "unit": "seconds"
}
```

**7. HTTP Request Node (Check Status):**
```json
{
  "method": "GET",
  "url": "=http://localhost:8000/api/v1/status/{{ $json.task_id }}"
}
```

**8. IF Node:**
```json
{
  "conditions": {
    "string": [
      {
        "value1": "={{ $json.status }}",
        "operation": "equals",
        "value2": "completed"
      }
    ]
  }
}
```

**9. HTTP Request Node (Download):**
```json
{
  "method": "GET",
  "url": "=http://localhost:8000{{ $json.video_url }}",
  "responseFormat": "file"
}
```

## Use Cases

### 1. Daily Content Automation
- Generate daily Instagram Reels automatically
- Create YouTube Shorts from trending topics
- Produce video quotes for social media

### 2. E-commerce Product Videos
- Generate product showcase videos
- Create promotional content
- Automate seasonal campaigns

### 3. News to Video
- Convert RSS feeds to video summaries
- Create visual news updates
- Automate breaking news videos

### 4. Educational Content
- Generate explainer videos
- Create tutorial intros
- Produce course promotional videos

### 5. Marketing Campaigns
- Automated ad creative generation
- A/B testing video variations
- Personalized video messages

### 6. Social Media Management
- Schedule posts across platforms
- Generate content for slow periods
- Maintain posting consistency

## Advanced Integration

### Error Handling

```javascript
// Function Node for Error Handling
if ($json.status === 'failed') {
  // Send alert
  return {
    json: {
      error: true,
      message: $json.error,
      task_id: $json.task_id,
      alert: 'Video generation failed'
    }
  };
}

return { json: $json };
```

### Retry Logic

```javascript
// Function Node for Retry
const maxRetries = 3;
const currentRetry = $json.retry_count || 0;

if ($json.status !== 'completed' && currentRetry < maxRetries) {
  return {
    json: {
      ...$json,
      retry_count: currentRetry + 1,
      should_retry: true
    }
  };
}

return { json: $json };
```

### Quality Checks

```javascript
// Function Node for Quality Validation
const minFileSize = 100000; // 100KB

if ($binary.data.fileSize < minFileSize) {
  return {
    json: {
      quality_check: 'failed',
      reason: 'File size too small',
      file_size: $binary.data.fileSize
    }
  };
}

return {
  json: {
    quality_check: 'passed',
    file_size: $binary.data.fileSize
  }
};
```

## Environment Variables

Set these in VideoGen for n8n integration:

```bash
# n8n callback webhook
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/video-complete

# Optional: Authentication token for n8n webhooks
N8N_AUTH_TOKEN=your-secure-token
```

## Troubleshooting

### Issue: Workflow times out

**Solution:** Increase wait times between status checks
```json
{
  "amount": 30,
  "unit": "seconds"
}
```

### Issue: Video not found

**Solution:** Add retry logic and check task status multiple times

### Issue: n8n can't reach VideoGen

**Solution:** 
- Check firewall settings
- Use proper URLs (not localhost if on different machines)
- Verify network connectivity

### Issue: Authentication errors

**Solution:**
- Verify API key is set correctly
- Check Header Auth credentials in n8n
- Ensure ENABLE_AUTH is true in VideoGen .env

### Issue: Videos generating too slowly

**Solution:**
- Use GPU acceleration in VideoGen
- Reduce video duration
- Lower resolution for testing

## Best Practices

1. **Use Webhooks Over Polling:** More efficient for production
2. **Implement Error Handling:** Always catch and log errors
3. **Add Retry Logic:** Network issues happen
4. **Monitor Task Status:** Track success rates
5. **Store Metadata:** Keep records of generated videos
6. **Use Database:** Store task IDs for later reference
7. **Implement Rate Limiting:** Don't overwhelm the service
8. **Cache Results:** Avoid regenerating same content
9. **Version Control Workflows:** Export and backup n8n workflows
10. **Test Thoroughly:** Always test before production use

## Security Considerations

1. **API Keys:** Always use authentication in production
2. **Webhooks:** Validate webhook sources
3. **Input Validation:** Sanitize prompts and parameters
4. **Access Control:** Limit who can trigger workflows
5. **Logging:** Monitor for suspicious activity
6. **HTTPS:** Use encrypted connections
7. **Secrets:** Use n8n's credential system

## Performance Tips

1. **Batch Processing:** Generate multiple videos efficiently
2. **Parallel Execution:** Use n8n's split/merge nodes
3. **Caching:** Cache common requests
4. **Queue Management:** Implement proper queuing
5. **Resource Monitoring:** Track VideoGen resource usage

## Examples Repository

Find more examples in the `examples/` directory:
- `n8n_workflow.json` - Basic workflow
- `generate_video.py` - Python integration
- `test_api.py` - API testing script

## Support

- **n8n Documentation:** https://docs.n8n.io
- **VideoGen Issues:** https://github.com/meet1785/videogen/issues
- **Community Forum:** Open discussions on GitHub

## Next Steps

1. Import the example workflow
2. Customize for your use case
3. Test with sample prompts
4. Deploy to production
5. Monitor and optimize
6. Scale as needed

Happy automating! 🎬
