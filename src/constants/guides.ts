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
    }
  ]
};

export const EDITOR_GUIDE = {
  title: "Editor Guide",
  sections: [
    {
      id: "campaigns",
      title: "Creating Campaigns",
      content: "Use the Campaigns section to draft new dispatches. You can use the Visual Studio to design assets and Gemini AI to assist with copywriting and subject line optimization."
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
  "data-layer": "Advanced data mapping and event tracking for enterprise-scale personalization."
};
