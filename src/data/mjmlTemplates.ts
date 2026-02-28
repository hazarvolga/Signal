const baseHeader = `
    <mj-section padding="40px 20px">
      <mj-column>
        <mj-text align="center" font-size="24px" font-weight="900" letter-spacing="-1px">SIGNAL.</mj-text>
      </mj-column>
    </mj-section>
`;

const baseFooter = `
    <mj-section padding="40px 20px">
      <mj-column>
        <mj-text align="center" font-size="11px" color="#999999">
          {{company_name}} &bull; {{company_address}}<br/>
          <a href="{{unsubscribe_link}}" style="color: #999999;">Unsubscribe</a>
        </mj-text>
      </mj-column>
    </mj-section>
`;

const createTemplate = (name: string, title: string, preview: string, body: string) => ({
  name,
  category: "System",
  content: `<mjml>
  <mj-head>
    <mj-title>${title}</mj-title>
    <mj-preview>${preview}</mj-preview>
    <mj-attributes>
      <mj-all font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" color="#1a1a1a" />
      <mj-text font-size="16px" line-height="24px" />
      <mj-button background-color="#8B1A1A" color="#ffffff" border-radius="6px" font-weight="bold" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f5f2ed">
    ${baseHeader}
    <mj-section background-color="#ffffff" padding="40px" border-radius="8px">
      <mj-column>
        ${body}
      </mj-column>
    </mj-section>
    ${baseFooter}
  </mj-body>
</mjml>`
});

export const mjmlTemplates = [
  createTemplate(
    "Product Announcement",
    "New Product Announcement",
    "Meet the new {{product_name}}",
    `
        <mj-text font-size="32px" font-weight="bold" line-height="40px" align="center">Meet the New {{product_name}}</mj-text>
        <mj-text align="center" color="#666666" padding-top="10px">The next generation of {{company_name}} is here.</mj-text>
        <mj-image src="https://picsum.photos/seed/product/1200/600" alt="Product Image" padding="30px 0" border-radius="4px" />
        <mj-text>Hi {{first_name}},</mj-text>
        <mj-text>We've been working behind the scenes for months to bring you something truly special. Today, we're excited to announce the official launch of <strong>{{product_name}}</strong>.</mj-text>
        <mj-button href="{{cta_link}}" padding-top="20px">Explore Now</mj-button>
    `
  ),
  createTemplate(
    "New Feature Release",
    "New Feature Release",
    "Introducing {{feature_name}}",
    `
        <mj-text font-size="12px" font-weight="bold" color="#8B1A1A" text-transform="uppercase" letter-spacing="2px">New Feature</mj-text>
        <mj-text font-size="28px" font-weight="bold" padding-top="10px">Say hello to {{feature_name}}</mj-text>
        <mj-text color="#666666">We've just added a powerful new way to manage your {{workflow_type}}.</mj-text>
        <mj-divider border-width="1px" border-color="#eeeeee" padding="30px 0" />
        <mj-text font-weight="bold">What's new?</mj-text>
        <mj-text>
          <ul>
            <li>Real-time collaboration</li>
            <li>Advanced filtering</li>
            <li>One-click export</li>
          </ul>
        </mj-text>
        <mj-button href="{{cta_link}}" align="left" padding-top="20px">Try It Now</mj-button>
    `
  ),
  createTemplate(
    "Version Update",
    "Version Update",
    "Version {{version}} is live",
    `
        <mj-text font-size="24px" font-weight="bold">Version {{version}} is here</mj-text>
        <mj-text color="#666666" padding-top="10px">We've released several improvements and bug fixes to make your experience smoother.</mj-text>
        <mj-text padding-top="20px">
          <strong>What's changed:</strong>
          <ul>
            <li>Performance optimizations</li>
            <li>Enhanced security</li>
            <li>UI refinements</li>
          </ul>
        </mj-text>
        <mj-button href="{{cta_link}}" align="left" padding-top="20px">View Changelog</mj-button>
    `
  ),
  createTemplate(
    "Beta Invitation",
    "Beta Invitation",
    "You're invited to the {{feature}} Beta",
    `
        <mj-text font-size="28px" font-weight="bold" align="center">You're Invited</mj-text>
        <mj-text align="center" color="#666666">Join our exclusive Beta program for {{feature_name}}.</mj-text>
        <mj-text padding-top="30px">Hi {{first_name}},</mj-text>
        <mj-text>We're putting the finishing touches on our most ambitious feature yet. Before we release it to the world, we want to give our most active users a chance to try it out.</mj-text>
        <mj-button href="{{cta_link}}" padding-top="30px">Join the Beta</mj-button>
    `
  ),
  createTemplate(
    "Early Access Launch",
    "Early Access Launch",
    "Your early access starts now",
    `
        <mj-text font-size="32px" font-weight="bold" align="center">The wait is over.</mj-text>
        <mj-text align="center" color="#666666">Your early access to {{product_name}} is officially live.</mj-text>
        <mj-image src="https://picsum.photos/seed/early/1200/600" alt="Early Access" padding="30px 0" />
        <mj-text>Hi {{first_name}},</mj-text>
        <mj-text>As someone who signed up for our waitlist, you're among the first to get access to {{product_name}}.</mj-text>
        <mj-button href="{{cta_link}}" padding-top="30px">Get Started</mj-button>
    `
  ),
  createTemplate(
    "Webinar Invitation",
    "Webinar Invitation",
    "Join us for: {{webinar_title}}",
    `
        <mj-text font-size="12px" font-weight="bold" color="#8B1A1A" text-transform="uppercase" letter-spacing="2px">Live Webinar</mj-text>
        <mj-text font-size="28px" font-weight="bold" padding-top="10px">{{webinar_title}}</mj-text>
        <mj-text color="#666666">Join us on {{date}} at {{time}} for an exclusive session.</mj-text>
        <mj-button href="{{cta_link}}" align="left" padding-top="30px">Save My Seat</mj-button>
    `
  ),
  createTemplate(
    "Event Reminder",
    "Event Reminder",
    "Starting soon: {{event_name}}",
    `
        <mj-text font-size="24px" font-weight="bold" align="center">Don't forget!</mj-text>
        <mj-text align="center" color="#666666">We're starting in {{time_remaining}}.</mj-text>
        <mj-divider border-width="1px" border-color="#eeeeee" padding="30px 0" />
        <mj-text align="center" font-size="20px" font-weight="bold">{{event_name}}</mj-text>
        <mj-button href="{{cta_link}}" padding-top="30px">Join Now</mj-button>
    `
  ),
  createTemplate(
    "Case Study",
    "Case Study",
    "How {{customer}} achieved {{result}}",
    `
        <mj-text font-size="12px" font-weight="bold" color="#8B1A1A" text-transform="uppercase" letter-spacing="2px">Case Study</mj-text>
        <mj-text font-size="28px" font-weight="bold" padding-top="10px">How {{customer_name}} scaled by {{percentage}}%</mj-text>
        <mj-image src="https://picsum.photos/seed/case/1200/600" alt="Case Study" padding="30px 0" />
        <mj-text>"{{quote}}"</mj-text>
        <mj-button href="{{cta_link}}" align="left" padding-top="30px">Read Story</mj-button>
    `
  ),
  createTemplate(
    "Customer Success Story",
    "Customer Success Story",
    "Real results from real customers",
    `
        <mj-text font-size="24px" font-weight="bold" align="center">Customer Spotlight</mj-text>
        <mj-text align="center" color="#666666">See how teams like yours are winning with {{company_name}}.</mj-text>
        <mj-divider border-width="1px" border-color="#eeeeee" padding="30px 0" />
        <mj-text>This week, we're highlighting <strong>{{customer_name}}</strong>.</mj-text>
        <mj-button href="{{cta_link}}" padding-top="30px">See Their Story</mj-button>
    `
  ),
  createTemplate(
    "Onboarding Welcome Email",
    "Welcome to {{company_name}}",
    "Let's get started with your new account",
    `
        <mj-text font-size="32px" font-weight="bold" align="center">Welcome aboard, {{first_name}}!</mj-text>
        <mj-text align="center" color="#666666">We're thrilled to have you with us.</mj-text>
        <mj-text padding-top="30px">Hi {{first_name}},</mj-text>
        <mj-text>Thanks for choosing {{company_name}}. You've just taken the first step toward mastering your editorial broadcasts.</mj-text>
        <mj-button href="{{cta_link}}" padding-top="30px">Go to Dashboard</mj-button>
    `
  ),
  createTemplate(
    "Onboarding Step 2",
    "Next Steps",
    "Ready for the next step?",
    `
        <mj-text font-size="24px" font-weight="bold">You're doing great!</mj-text>
        <mj-text color="#666666" padding-top="10px">Now that you've set up your profile, it's time to connect your first audience.</mj-text>
        <mj-button href="{{cta_link}}" align="left" padding-top="30px">Connect Audience</mj-button>
    `
  ),
  createTemplate(
    "Onboarding Completion",
    "Onboarding Complete",
    "You're all set!",
    `
        <mj-text font-size="24px" font-weight="bold" align="center">You're a Pro Now!</mj-text>
        <mj-text align="center" color="#666666">You've completed all the onboarding steps. You're ready to broadcast.</mj-text>
        <mj-image src="https://picsum.photos/seed/complete/600/400" alt="Complete" padding="30px 0" />
        <mj-button href="{{cta_link}}" padding-top="30px">Start Your First Campaign</mj-button>
    `
  ),
  createTemplate(
    "Trial Expiring",
    "Trial Expiring",
    "Don't lose your access",
    `
        <mj-text font-size="24px" font-weight="bold">Your trial ends in {{days}} days</mj-text>
        <mj-text color="#666666" padding-top="10px">We hope you've enjoyed exploring {{company_name}}. Upgrade now to keep your data and access.</mj-text>
        <mj-button href="{{cta_link}}" align="left" padding-top="30px">Upgrade Now</mj-button>
    `
  ),
  createTemplate(
    "Upgrade to Pro",
    "Upgrade to Pro",
    "Unlock the full power of SIGNAL",
    `
        <mj-text font-size="28px" font-weight="bold" align="center">Ready to Level Up?</mj-text>
        <mj-text align="center" color="#666666">Unlock advanced analytics, unlimited dispatches, and priority support.</mj-text>
        <mj-button href="{{cta_link}}" padding-top="30px">Upgrade to Pro</mj-button>
    `
  ),
  createTemplate(
    "Payment Failed",
    "Payment Failed",
    "Action required: Payment failed",
    `
        <mj-text font-size="24px" font-weight="bold" color="#8B1A1A">Payment Failed</mj-text>
        <mj-text color="#666666" padding-top="10px">We were unable to process your recent payment. Please update your billing information to avoid service interruption.</mj-text>
        <mj-button href="{{cta_link}}" align="left" padding-top="30px">Update Billing</mj-button>
    `
  ),
  createTemplate(
    "Invoice Available",
    "Invoice Available",
    "Your invoice for {{month}} is ready",
    `
        <mj-text font-size="24px" font-weight="bold">Your invoice is ready</mj-text>
        <mj-text color="#666666" padding-top="10px">The invoice for your {{company_name}} subscription is now available for download.</mj-text>
        <mj-button href="{{cta_link}}" align="left" padding-top="30px">Download Invoice</mj-button>
    `
  ),
  createTemplate(
    "Security Alert",
    "Security Alert",
    "New login detected",
    `
        <mj-text font-size="24px" font-weight="bold" color="#8B1A1A">Security Alert</mj-text>
        <mj-text color="#666666" padding-top="10px">We detected a new login to your account from a new device or location.</mj-text>
        <mj-text padding-top="20px">
          <strong>Location:</strong> {{location}}<br/>
          <strong>Device:</strong> {{device}}
        </mj-text>
        <mj-text padding-top="20px">If this wasn't you, please secure your account immediately.</mj-text>
        <mj-button href="{{cta_link}}" align="left" padding-top="30px">Secure Account</mj-button>
    `
  ),
  createTemplate(
    "Password Reset (Marketing Styled)",
    "Password Reset",
    "Reset your password",
    `
        <mj-text font-size="24px" font-weight="bold">Forgot your password?</mj-text>
        <mj-text color="#666666" padding-top="10px">No worries, it happens to the best of us. Click the button below to reset it.</mj-text>
        <mj-button href="{{cta_link}}" align="left" padding-top="30px">Reset Password</mj-button>
    `
  ),
  createTemplate(
    "Re-engagement Campaign",
    "We miss you",
    "It's been a while...",
    `
        <mj-text font-size="28px" font-weight="bold" align="center">We miss you, {{first_name}}!</mj-text>
        <mj-text align="center" color="#666666">It's been a while since we've seen you. Here's what you've missed.</mj-text>
        <mj-button href="{{cta_link}}" padding-top="30px">See What's New</mj-button>
    `
  ),
  createTemplate(
    "Win-back Campaign",
    "Come back to SIGNAL",
    "A special offer just for you",
    `
        <mj-text font-size="28px" font-weight="bold" align="center">Come back and save</mj-text>
        <mj-text align="center" color="#666666">We'd love to have you back. Use code <strong>COMEBACK</strong> for 50% off your next 3 months.</mj-text>
        <mj-button href="{{cta_link}}" padding-top="30px">Claim Offer</mj-button>
    `
  ),
  createTemplate(
    "Newsletter – Minimal",
    "The Minimalist",
    "This week's top stories",
    `
        <mj-text font-size="24px" font-weight="bold">The Minimalist</mj-text>
        <mj-divider border-width="1px" border-color="#eeeeee" padding="20px 0" />
        <mj-text font-weight="bold">1. The Future of AI</mj-text>
        <mj-text font-size="14px">How AI is changing the editorial landscape.</mj-text>
        <mj-text font-weight="bold" padding-top="10px">2. Scaling Your Team</mj-text>
        <mj-text font-size="14px">Best practices for growing your newsroom.</mj-text>
        <mj-button href="{{cta_link}}" align="left" padding-top="30px">Read More</mj-button>
    `
  ),
  createTemplate(
    "Newsletter – Editorial",
    "The Weekly Signal",
    "Deep dives and analysis",
    `
        <mj-text font-size="32px" font-weight="bold" line-height="40px">{{headline}}</mj-text>
        <mj-text font-style="italic" color="#666666" padding-top="10px">By {{author}}</mj-text>
        <mj-image src="https://picsum.photos/seed/editorial/1200/800" alt="Hero" padding="30px 0" />
        <mj-text>{{content}}</mj-text>
        <mj-button href="{{cta_link}}" align="left" padding-top="30px">Read Full Article</mj-button>
    `
  ),
  createTemplate(
    "Newsletter – Multi-block",
    "The Digest",
    "Everything you need to know",
    `
        <mj-text font-size="24px" font-weight="bold">The Digest</mj-text>
        <mj-section padding="20px 0">
          <mj-column width="40%">
            <mj-image src="https://picsum.photos/seed/1/400/300" padding="0" />
          </mj-column>
          <mj-column width="60%" padding-left="20px">
            <mj-text font-weight="bold">Story One</mj-text>
            <mj-text font-size="14px">Brief summary of the first story.</mj-text>
          </mj-column>
        </mj-section>
        <mj-section padding="20px 0">
          <mj-column width="40%">
            <mj-image src="https://picsum.photos/seed/2/400/300" padding="0" />
          </mj-column>
          <mj-column width="60%" padding-left="20px">
            <mj-text font-weight="bold">Story Two</mj-text>
            <mj-text font-size="14px">Brief summary of the second story.</mj-text>
          </mj-column>
        </mj-section>
        <mj-button href="{{cta_link}}" padding-top="30px">View All Stories</mj-button>
    `
  ),
  createTemplate(
    "Black Friday Campaign",
    "Black Friday is here",
    "Our biggest sale of the year",
    `
        <mj-text font-size="48px" font-weight="900" align="center" color="#8B1A1A">BLACK FRIDAY</mj-text>
        <mj-text align="center" font-size="24px" font-weight="bold">50% OFF EVERYTHING</mj-text>
        <mj-text align="center" color="#666666" padding-top="10px">Don't miss out on our biggest sale ever.</mj-text>
        <mj-button href="{{cta_link}}" padding-top="30px">Shop the Sale</mj-button>
    `
  ),
  createTemplate(
    "Limited Time Offer",
    "Last chance to save",
    "Offer ends at midnight",
    `
        <mj-text font-size="28px" font-weight="bold" align="center">Last Chance!</mj-text>
        <mj-text align="center" color="#666666">Your special discount expires in just a few hours.</mj-text>
        <mj-button href="{{cta_link}}" padding-top="30px">Claim Your Discount</mj-button>
    `
  ),
  createTemplate(
    "Seasonal Campaign",
    "Happy Holidays",
    "A gift from us to you",
    `
        <mj-text font-size="32px" font-weight="bold" align="center">Happy Holidays!</mj-text>
        <mj-text align="center" color="#666666">Wishing you a wonderful season from the entire team at {{company_name}}.</mj-text>
        <mj-image src="https://picsum.photos/seed/holiday/600/400" alt="Holiday" padding="30px 0" />
        <mj-button href="{{cta_link}}" padding-top="30px">See Holiday Specials</mj-button>
    `
  ),
  createTemplate(
    "Survey Request",
    "We value your feedback",
    "Got 2 minutes?",
    `
        <mj-text font-size="24px" font-weight="bold">How are we doing?</mj-text>
        <mj-text color="#666666" padding-top="10px">We're always looking to improve. Could you take 2 minutes to share your thoughts?</mj-text>
        <mj-button href="{{cta_link}}" align="left" padding-top="30px">Take the Survey</mj-button>
    `
  ),
  createTemplate(
    "NPS Email",
    "How likely are you to recommend us?",
    "Quick question...",
    `
        <mj-text font-size="20px" font-weight="bold" align="center">How likely are you to recommend {{company_name}} to a friend or colleague?</mj-text>
        <mj-text align="center" color="#666666" padding-top="10px">0 = Not at all likely, 10 = Extremely likely</mj-text>
        <mj-button href="{{cta_link}}" padding-top="30px">Rate Us</mj-button>
    `
  ),
  createTemplate(
    "Feedback Request",
    "Help us build the future",
    "We'd love your input",
    `
        <mj-text font-size="24px" font-weight="bold">Help us improve {{feature_name}}</mj-text>
        <mj-text color="#666666" padding-top="10px">We're building something new and we'd love to hear your thoughts on the direction we're taking.</mj-text>
        <mj-button href="{{cta_link}}" align="left" padding-top="30px">Share Feedback</mj-button>
    `
  ),
  createTemplate(
    "Product Tips Email",
    "Pro Tip: {{tip_title}}",
    "Get more out of SIGNAL",
    `
        <mj-text font-size="12px" font-weight="bold" color="#8B1A1A" text-transform="uppercase" letter-spacing="2px">Pro Tip</mj-text>
        <mj-text font-size="24px" font-weight="bold" padding-top="10px">{{tip_title}}</mj-text>
        <mj-text color="#666666">Did you know you can {{tip_description}}? It's a great way to save time and improve your workflow.</mj-text>
        <mj-button href="{{cta_link}}" align="left" padding-top="30px">Learn More</mj-button>
    `
  ),
  createTemplate(
    "Educational Content Drop",
    "New Guide: {{guide_title}}",
    "Master the art of {{topic}}",
    `
        <mj-text font-size="28px" font-weight="bold">Mastering {{topic}}</mj-text>
        <mj-text color="#666666" padding-top="10px">We've just released a comprehensive guide on how to {{result}}.</mj-text>
        <mj-image src="https://picsum.photos/seed/guide/1200/600" alt="Guide" padding="30px 0" />
        <mj-button href="{{cta_link}}" align="left" padding-top="30px">Download Guide</mj-button>
    `
  ),
  createTemplate(
    "Blog Digest",
    "Latest from the Blog",
    "In case you missed it",
    `
        <mj-text font-size="24px" font-weight="bold">Latest from the Blog</mj-text>
        <mj-divider border-width="1px" border-color="#eeeeee" padding="20px 0" />
        <mj-text font-weight="bold">{{post_1_title}}</mj-text>
        <mj-text font-size="14px">{{post_1_summary}}</mj-text>
        <mj-text font-weight="bold" padding-top="10px">{{post_2_title}}</mj-text>
        <mj-text font-size="14px">{{post_2_summary}}</mj-text>
        <mj-button href="{{cta_link}}" align="left" padding-top="30px">Visit Blog</mj-button>
    `
  ),
  createTemplate(
    "Community Invitation",
    "Join the SIGNAL Community",
    "Connect with other editors",
    `
        <mj-text font-size="28px" font-weight="bold" align="center">Join the Conversation</mj-text>
        <mj-text align="center" color="#666666">Connect with thousands of other editorial professionals in our private community.</mj-text>
        <mj-button href="{{cta_link}}" padding-top="30px">Join Community</mj-button>
    `
  ),
  createTemplate(
    "Referral Program",
    "Give $20, Get $20",
    "Share the love",
    `
        <mj-text font-size="28px" font-weight="bold" align="center">Share SIGNAL with friends</mj-text>
        <mj-text align="center" color="#666666">Refer a friend and you'll both get $20 in credit when they sign up for a paid plan.</mj-text>
        <mj-button href="{{cta_link}}" padding-top="30px">Get Your Referral Link</mj-button>
    `
  ),
  createTemplate(
    "Integration Launch",
    "SIGNAL + {{partner}}",
    "A new integration is live",
    `
        <mj-text font-size="28px" font-weight="bold">Better together: SIGNAL + {{partner_name}}</mj-text>
        <mj-text color="#666666" padding-top="10px">You can now connect your SIGNAL account directly to {{partner_name}} to automate your {{workflow}}.</mj-text>
        <mj-button href="{{cta_link}}" align="left" padding-top="30px">Set Up Integration</mj-button>
    `
  ),
  createTemplate(
    "Partnership Announcement",
    "Exciting News: Partnership with {{partner}}",
    "Expanding the SIGNAL ecosystem",
    `
        <mj-text font-size="28px" font-weight="bold">Announcing our partnership with {{partner_name}}</mj-text>
        <mj-text color="#666666" padding-top="10px">We're joining forces to bring you even more value and innovation in the editorial space.</mj-text>
        <mj-button href="{{cta_link}}" align="left" padding-top="30px">Read Announcement</mj-button>
    `
  ),
  createTemplate(
    "AI Feature Promotion",
    "Powered by AI: {{feature_name}}",
    "Work smarter, not harder",
    `
        <mj-text font-size="12px" font-weight="bold" color="#8B1A1A" text-transform="uppercase" letter-spacing="2px">AI Powered</mj-text>
        <mj-text font-size="28px" font-weight="bold" padding-top="10px">Intelligence at your fingertips</mj-text>
        <mj-text color="#666666">Our new AI-powered {{feature_name}} helps you generate {{output}} in seconds.</mj-text>
        <mj-button href="{{cta_link}}" align="left" padding-top="30px">Try AI Features</mj-button>
    `
  ),
  createTemplate(
    "Enterprise Plan Promotion",
    "Scale with SIGNAL Enterprise",
    "Custom solutions for large teams",
    `
        <mj-text font-size="28px" font-weight="bold" align="center">Built for Scale</mj-text>
        <mj-text align="center" color="#666666">Get custom security, dedicated support, and advanced governance features with our Enterprise plan.</mj-text>
        <mj-button href="{{cta_link}}" padding-top="30px">Contact Sales</mj-button>
    `
  ),
  createTemplate(
    "Changelog Summary",
    "Monthly Changelog: {{month}}",
    "See what we've built lately",
    `
        <mj-text font-size="24px" font-weight="bold">What's New in {{month}}</mj-text>
        <mj-divider border-width="1px" border-color="#eeeeee" padding="20px 0" />
        <mj-text font-weight="bold">Feature One</mj-text>
        <mj-text font-size="14px">Details about the first feature.</mj-text>
        <mj-text font-weight="bold" padding-top="10px">Feature Two</mj-text>
        <mj-text font-size="14px">Details about the second feature.</mj-text>
        <mj-button href="{{cta_link}}" align="left" padding-top="30px">View Full Changelog</mj-button>
    `
  ),
  createTemplate(
    "Monthly Platform Update",
    "Platform Update: {{month}}",
    "A look back at the month",
    `
        <mj-text font-size="28px" font-weight="bold">Your Monthly Update</mj-text>
        <mj-text color="#666666" padding-top="10px">Here's a summary of everything that happened on the platform this month.</mj-text>
        <mj-divider border-width="1px" border-color="#eeeeee" padding="30px 0" />
        <mj-text font-weight="bold">Key Highlights:</mj-text>
        <mj-text>
          &bull; {{highlight_1}}<br/>
          &bull; {{highlight_2}}<br/>
          &bull; {{highlight_3}}
        </mj-text>
        <mj-button href="{{cta_link}}" align="left" padding-top="30px">Read More</mj-button>
    `
  )
];
