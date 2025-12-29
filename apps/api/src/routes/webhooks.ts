import { db, eq, invites, users } from '@boris/database';
import type { DeletedObjectJSON, UserJSON, WebhookEvent } from '@clerk/express';
import { verifyWebhook } from '@clerk/express/webhooks';
import express, { Router } from 'express';

export const webhooksRouter = Router();

webhooksRouter.post(
  '/clerk',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    let evt: WebhookEvent;

    try {
      evt = await verifyWebhook(req);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    try {
      switch (evt.type) {
        case 'user.created': {
          const userData = evt.data as UserJSON;
          const email = userData.email_addresses?.[0]?.email_address;

          // Check for pending invite
          let organizationId: string | null = null;
          let isAdmin = false;

          if (email) {
            const invite = await db.query.invites.findFirst({
              where: eq(invites.email, email.toLowerCase()),
            });

            if (invite) {
              organizationId = invite.organizationId;
              isAdmin = invite.isAdmin;

              // Delete the invite after using it
              await db.delete(invites).where(eq(invites.id, invite.id));
            }
          }

          await db
            .insert(users)
            .values({
              clerkId: userData.id,
              organizationId,
              isAdmin,
            })
            .onConflictDoNothing();
          break;
        }
        case 'user.deleted': {
          const deletedData = evt.data as DeletedObjectJSON;
          if (deletedData.id) {
            await db.delete(users).where(eq(users.clerkId, deletedData.id));
          }
          break;
        }
      }
    } catch (error) {
      console.error(`Webhook handler error for ${evt.type}:`, error);
      // Still return 200 - Clerk will retry on non-2xx
    }

    return res.json({ received: true });
  },
);
