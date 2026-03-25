export const ADMIN_GUIDE = {
  title: "Administrator Guide",
  sections: [
    {
      id: "overview",
      title: "System Overview",
      content: "SIGNAL is an enterprise-grade editorial dispatch system. As an administrator, you have full control over the infrastructure, team, and brand assets."
    },
    {
      id: "team",
      title: "Team & Roles",
      content: "Manage your editorial team in the Collaboration section. You can define custom roles with granular permissions (e.g., 'campaign:edit', 'team:manage'). Use Brand Kits to maintain visual consistency across multiple publications."
    },
    {
      id: "infrastructure",
      title: "Infrastructure",
      content: "The Infrastructure section allows you to manage API keys for external services (Gemini, Stripe, etc.) and monitor system health. Ensure your webhooks are correctly configured for real-time data sync."
    },
    {
      id: "governance",
      title: "Governance",
      content: "Set up approval workflows to ensure all campaigns and templates meet editorial standards before being dispatched. You can track all team activity in the live feed."
    },
    {
      id: "growth",
      title: "Growth Engine",
      content: "Configure the built-in referral program to turn your subscribers into your biggest growth channel. Set up reward tiers and track top referrers."
    },
    {
      id: "forms_pages",
      title: "Forms & Landing Pages",
      content: "Create embeddable pop-ups and hosted 'link-in-bio' style landing pages to capture leads directly into your SIGNAL audience, eliminating the need for third-party tools."
    }
  ]
};

export const EDITOR_GUIDE = {
  title: "Editor Guide",
  sections: [
    {
      id: "campaigns",
      title: "Creating Campaigns",
      content: "Use the Campaigns section to draft new dispatches. You can use the Visual Studio to design assets and Gemini AI to assist with copywriting and subject line optimization. Use the 'Dynamic & Growth' tools to insert personalized content blocks and referral widgets."
    },
    {
      id: "templates",
      title: "Template Management",
      content: "Templates are the backbone of your dispatches. Use the Template editor to create reusable layouts. Ensure you use the defined Brand Kit colors and typography."
    },
    {
      id: "audiences",
      title: "Audience Segmentation",
      content: "Target your dispatches by creating segments based on user behavior, location, or custom attributes. Use the Validation tool to ensure email deliverability."
    },
    {
      id: "visual-studio",
      title: "Visual Studio",
      content: "The Visual Studio is a powerful tool for creating high-impact editorial imagery. Use the AI-powered generation tools to create unique assets for your stories."
    }
  ]
};

export const TOOLTIP_CONTENT: Record<string, string> = {
  "dashboard-metrics": "Overview of your publication's performance including reach, engagement, and revenue.",
  "campaign-editor": "Draft your editorial dispatch here. Use the 'AI Assist' button for content suggestions.",
  "audience-segments": "Group your readers based on their interests and engagement levels for better targeting.",
  "automation-flows": "Design automated journeys for your readers, such as welcome series or re-engagement campaigns.",
  "collaboration-team": "Invite team members and assign them specific roles for editorial workflow management.",
  "infrastructure-api": "Manage your connections to external services. Keep your keys secure.",
  "visual-studio-canvas": "Design custom assets for your newsletters using our integrated canvas and AI tools.",
  "commerce-revenue": "Track revenue generated from your editorial content and manage product feeds.",
  "integrations-api": "Connect SIGNAL to your existing tools via webhooks and API integrations.",
  "reports-analytics": "Deep dive into campaign performance, reader behavior, and growth metrics.",
  "templates-library": "Manage reusable editorial layouts to ensure brand consistency across all dispatches.",
  "validation-deliverability": "Verify email addresses and ensure your dispatches reach the inbox.",
  "data-layer": "Advanced data mapping and event tracking for enterprise-scale personalization.",
  "growth-overview": "Monitor the performance of your newsletter referral program. See how many new subscribers are joining via referrals.",
  "growth-rewards": "Define the milestones and rewards for your referral program (e.g., 'Refer 3 friends to get an eBook').",
  "growth-leaderboard": "See your top referring subscribers. These are your most valuable brand advocates.",
  "forms_overview": "Create standalone landing pages or embeddable pop-up forms to collect email addresses and grow your list.",
  "dynamic_content": "Insert content blocks that change based on subscriber data (e.g., show different text to users in different cities).",
  "referral_widget": "Insert a personalized block showing the subscriber their unique referral link and progress towards rewards."
};
