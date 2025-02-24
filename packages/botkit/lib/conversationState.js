"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotkitConversationState = void 0;
/**
 * @module botkit
 */
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const botbuilder_1 = require("botbuilder");
/**
 * A customized version of [ConversationState](https://docs.microsoft.com/en-us/javascript/api/botbuilder-core/conversationstate?view=botbuilder-ts-latest) that  overide the [getStorageKey](#getStorageKey) method to create a more complex key value.
 * This allows Botkit to automatically track conversation state in scenarios where multiple users are present in a single channel,
 * or when threads or sub-channels parent channel that would normally collide based on the information defined in the conversation address field.
 * Note: This is used automatically inside Botkit and developers should not need to directly interact with it.
 * @ignore
 */
class BotkitConversationState extends botbuilder_1.ConversationState {
    getStorageKey(context) {
        const activity = context.activity;
        const channelId = activity.channelId;
        if (!activity.conversation || !activity.conversation.id) {
            throw new Error('missing activity.conversation');
        }
        // create a combo key by sorting all the fields in the conversation address and combining them all
        // mix in user id as well, because conversations are between the bot and a single user
        const conversationId = Object.keys(activity.conversation).filter((key) => { return key !== 'properties'; }).sort().map((key) => activity.conversation[key]).filter((val) => val !== '' && val !== null && typeof val !== 'undefined').join('-') + '-' + activity.from.id;
        if (!channelId) {
            throw new Error('missing activity.channelId');
        }
        if (!conversationId) {
            throw new Error('missing activity.conversation.id');
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore namespace is technically private
        return `${channelId}/conversations/${conversationId}/${this.namespace}`;
    }
}
exports.BotkitConversationState = BotkitConversationState;
//# sourceMappingURL=conversationState.js.map