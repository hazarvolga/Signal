import { Worker, Job } from 'bullmq';
import { ValidationEngine } from '../services/validation/engine';
import { prisma } from '../services/prisma'; // Assuming prisma is exported from a service
import Redis from 'ioredis';

const redisConnection = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL, { 
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 100, 3000);
  }
}) : null;

if (redisConnection) {
  redisConnection.on('error', (err: any) => {
    if (err.code === 'ECONNREFUSED') {
      console.warn("Redis connection refused for validation worker.");
    }
  });
}

export const validationWorker = redisConnection ? new Worker(
  'bulk-validation',
  async (job: Job) => {
    const { jobId, emails } = job.data;
    
    await prisma.bulkValidationJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING', totalCount: emails.length }
    });

    let processed = 0;
    let valid = 0;
    let invalid = 0;
    let risky = 0;

    for (const email of emails) {
      try {
        const result = await ValidationEngine.validate(email);
        
        await prisma.bulkValidationResult.create({
          data: {
            jobId,
            email,
            status: result.status,
            score: result.score,
            details: JSON.stringify(result.details)
          }
        });

        processed++;
        if (result.status === 'valid') valid++;
        else if (result.status === 'invalid') invalid++;
        else if (result.status === 'risky') risky++;

        // Update progress every 10 emails or at the end
        if (processed % 10 === 0 || processed === emails.length) {
          await prisma.bulkValidationJob.update({
            where: { id: jobId },
            data: { 
              processedCount: processed,
              validCount: valid,
              invalidCount: invalid,
              riskyCount: risky
            }
          });
        }
      } catch (e) {
        console.error(`Error validating ${email}:`, e);
      }
    }

    await prisma.bulkValidationJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED' }
    });
  },
  { connection: redisConnection as any }
) : null;

if (validationWorker) {
  validationWorker.on('completed', (job) => {
    console.log(`Bulk validation job ${job.id} completed`);
  });

  validationWorker.on('failed', (job, err) => {
    console.error(`Bulk validation job ${job?.id} failed:`, err);
  });
}
