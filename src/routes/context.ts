import type { Router } from "express";

export interface RouteContext {
  templateEngine: any;
  validationQueue: any;
  io: any;
  roomUsers: Map<string, Map<string, any>>;
  createEventAndBroadcast: (data: {
    type: string;
    contactId: string;
    campaignId?: string;
    variationId?: string;
    metadata?: any;
  }) => Promise<any>;
  refreshSegment: (segmentId: string) => Promise<number | undefined>;
  publicApiGateway: Router;
}
