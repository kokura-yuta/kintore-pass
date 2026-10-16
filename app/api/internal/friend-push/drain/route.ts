import {pushJobEndpoint, verifyPushJob} from '@/app/lib/friends/pushJobAuth';
import {drainFriendPush} from '@/app/lib/friends/pushDispatcher';

export const POST = async (request: Request) => {
  let rejection = '';
  const response = await pushJobEndpoint(request, {
  verify: req => verifyPushJob(req, {rejected: reason => {rejection = reason;}}),
  ready: () => process.env.FRIEND_PUSH_ENABLED === 'true' &&
    Boolean(process.env.EXPO_PUSH_ACCESS_TOKEN && process.env.CLERK_SECRET_KEY),
  drain: drainFriendPush,
  });
  // Fixed categories only, never a token/claim/error dump. Useful for unattended failures.
  if (response.status === 401 && rejection) response.headers.set('X-Push-Job-Auth', rejection);
  return response;
};
