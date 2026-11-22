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
import { requireReviewer, requireTopicKey } from '../middleware/topicAuth.js'

const router = express.Router()

router.post('/api/topics', requireReviewer, createTopic)
router.get('/api/topics', requireReviewer, listTopics)
router.get('/api/topics/:topic_id', requireReviewer, getTopic)
router.patch('/api/topics/:topic_id', requireReviewer, updateTopic)
router.delete('/api/topics/:topic_id', requireReviewer, deleteTopic)
router.post('/api/topics/:topic_id/poll', requireReviewer, pollTopic)

router.get('/connect/:topic_id', getConnectPage)

const publicV1 = express.Router()
publicV1.use(cors({ origin: '*' }))
publicV1.get('/topics/:topic_id/events', requireTopicKey, getPublicEvents)
publicV1.get('/topics/:topic_id/stream', requireTopicKey, getStream)
router.use('/v1', publicV1)

export default router
