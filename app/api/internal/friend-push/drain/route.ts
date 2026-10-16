import {pushJobEndpoint, verifyPushJob} from '@/app/lib/friends/pushJobAuth';
import {drainFriendPush} from '@/app/lib/friends/pushDispatcher';

export const POST = (request: Request) => pushJobEndpoint(request, {
  verify: verifyPushJob,
  ready: () => process.env.FRIEND_PUSH_ENABLED === 'true' &&
    Boolean(process.env.EXPO_PUSH_ACCESS_TOKEN && process.env.CLERK_SECRET_KEY),
  drain: drainFriendPush,
});
