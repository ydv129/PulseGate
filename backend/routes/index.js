import express from 'express'
import cors from 'cors'
import {
  createTopic,
  deleteTopic,
  getTopic,
  listTopics,
  pollTopic,
  updateTopic,
} from '../controllers/admin.controller.js'
import {
  getConnectPage,
  getPublicEvents,
  getStream,
} from '../controllers/consumer.controller.js'
import {
  approvePending,
  listFailedDeliveries,
  listPending,
  rejectPending,
  retryDelivery,
} from '../controllers/triage.controller.js'
import { requireReviewer, requireTopicKey } from '../middleware/topicAuth.js'

const router = express.Router()

router.post('/api/topics', requireReviewer, createTopic)
router.get('/api/topics', requireReviewer, listTopics)
router.get('/api/topics/:topic_id', requireReviewer, getTopic)
router.patch('/api/topics/:topic_id', requireReviewer, updateTopic)
router.delete('/api/topics/:topic_id', requireReviewer, deleteTopic)
router.post('/api/topics/:topic_id/poll', requireReviewer, pollTopic)

router.get('/api/triage/pending', requireReviewer, listPending)
router.post('/api/triage/:event_id/approve', requireReviewer, approvePending)
router.post('/api/triage/:event_id/reject', requireReviewer, rejectPending)
router.get('/api/replay/failed', requireReviewer, listFailedDeliveries)
router.post('/api/replay/:delivery_id/retry', requireReviewer, retryDelivery)

router.get('/connect/:topic_id', getConnectPage)

const publicV1 = express.Router()
publicV1.use(cors({ origin: '*' }))
publicV1.get('/topics/:topic_id/events', requireTopicKey, getPublicEvents)
publicV1.get('/topics/:topic_id/stream', requireTopicKey, getStream)
router.use('/v1', publicV1)

export default router
