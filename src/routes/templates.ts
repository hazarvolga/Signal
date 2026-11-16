import { Router } from "express";
import { prisma } from "../services/prisma";
import { AppError } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { getOrganizationId } from "../lib/authContext";
import {
  createDeclarativeFilter,
  parseDeclarativeFilterDefinition,
} from "../services/template/CustomFilterValidator";
import type { RouteContext } from "./context";

export default function registerTemplateRoutes(ctx: RouteContext): Router {
  const router = Router();
  router.use("/api/templates", requireAuth);
  router.use("/api/personalize", requireAuth);

  router.get("/api/templates", async (req, res, next) => {
    try {
      const templates = await prisma.template.findMany({
        where: { organizationId: getOrganizationId(req) },
        orderBy: { createdAt: "desc" },
      });
      res.json(templates);
    } catch (err) {
      next(err);
    }
  });

  router.post("/api/templates", requireRole("EDITOR", "ADMIN", "OWNER"), async (req, res, next) => {
    try {
      const { name, content, category } = req.body;
      const template = await prisma.template.create({
        data: {
          name,
          content,
          category,
          organizationId: getOrganizationId(req),
        },
      });
      res.json(template);
    } catch (err) {
      next(err);
    }
  });

  router.delete(
    "/api/templates/:id",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const result = await prisma.template.deleteMany({
          where: { id: req.params.id, organizationId: getOrganizationId(req) },
        });
        if (result.count === 0) throw new AppError("Template not found", 404);
        res.json({ success: true });
      } catch (err) {
        next(err);
      }
    }
  );

  /**
   * POST /api/templates/validate
   * Validate template syntax without rendering
   * Requirements: 6.1, 6.2, 20.1, 20.2
   */
  router.post("/api/templates/validate", async (req, res, next) => {
    try {
      const { template } = req.body;

      if (!template || typeof template !== "string") {
        return res.status(400).json({
          error: "Template string is required",
        });
      }

      const result = ctx.templateEngine.validate(template);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/templates/render
   * Render template with context data
   * Requirements: 20.3, 20.4
   */
  router.post("/api/templates/render", async (req, res, next) => {
    try {
      const { template, context, options } = req.body;

      if (!template || typeof template !== "string") {
        return res.status(400).json({
          error: "Template string is required",
        });
      }

      if (!context || typeof context !== "object") {
        return res.status(400).json({
          error: "Context object is required",
        });
      }

      const result = await ctx.templateEngine.render(template, context, options || {});
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/templates/test
   * Test template with multiple contexts
   * Requirements: 20.5, 20.6
   */
  router.post("/api/templates/test", async (req, res, next) => {
    try {
      const { template, testContexts } = req.body;

      if (!template || typeof template !== "string") {
        return res.status(400).json({
          error: "Template string is required",
        });
      }

      if (!Array.isArray(testContexts)) {
        return res.status(400).json({
          error: "testContexts must be an array",
        });
      }

      // Render template with each test context
      const results = await Promise.all(
        testContexts.map(async (context, index) => {
          try {
            const result = await ctx.templateEngine.render(template, context);
            return {
              index,
              context,
              success: result.success,
              html: result.html,
              error: result.errors?.[0],
              metrics: result.metrics,
            };
          } catch (error) {
            return {
              index,
              context,
              success: false,
              error: {
                type: "RUNTIME_ERROR",
                message: error instanceof Error ? error.message : String(error),
              },
            };
          }
        })
      );

      res.json({ results });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/templates/filters
   * Register custom filter for organization
   * SECURE FIX: Removed RCE vector (new Function). Uses safe declarative filter function.
   */
  router.post(
    "/api/templates/filters",
    requireAuth,
    requireRole("ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const orgId = (req.user as any)?.organizationId;
        if (!orgId) {
          throw new AppError("Organization required", 400);
        }

        const { name, definition, code, operation, args } = req.body;

        if (!name || typeof name !== "string") {
          return res.status(400).json({ error: "Filter name is required" });
        }

        // Validate filter name format (alphanumeric and underscores only)
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
          return res.status(400).json({
            error: "Filter name must be alphanumeric with underscores only",
          });
        }

        if (code !== undefined) {
          return res.status(400).json({
            error:
              "Executable JavaScript filters are not supported; submit a declarative definition",
          });
        }

        const definitionJson =
          typeof definition === "string"
            ? definition
            : JSON.stringify(definition ?? { operation, args });
        let declarativeDefinition;
        try {
          declarativeDefinition = parseDeclarativeFilterDefinition(definitionJson);
        } catch (error) {
          return res.status(400).json({
            error: error instanceof Error ? error.message : "Invalid declarative filter",
          });
        }

        ctx.templateEngine.registerFilter(
          name,
          createDeclarativeFilter(declarativeDefinition),
          orgId
        );

        res.json({
          success: true,
          message: `Filter '${name}' registered safely for organization ${orgId}`,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  router.post("/api/personalize/preview", async (req, res, next) => {
    try {
      const { content, contactId } = req.body;
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, organizationId: getOrganizationId(req) },
      });

      if (!contact) throw new AppError("Contact not found", 404);

      let personalized = content;
      const fields = {
        first_name: contact.firstName || "",
        last_name: contact.lastName || "",
        email: contact.email,
        ...JSON.parse(contact.customFields),
      };

      // Simple token replacement
      Object.entries(fields).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, "g");
        personalized = personalized.replace(regex, String(value));
      });

      // Simple conditional blocks: {{#if key}} ... {{/if}}
      const ifRegex = /{{#if (\w+)}}([\s\S]*?){{\/if}}/g;
      personalized = personalized.replace(ifRegex, (match, key, body) => {
        return fields[key] ? body : "";
      });

      res.json({ content: personalized });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
