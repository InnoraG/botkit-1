"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotkitConversation = void 0;
const dialogWrapper_1 = require("./dialogWrapper");
const botbuilder_1 = require("botbuilder");
const botbuilder_dialogs_1 = require("botbuilder-dialogs");
const mustache = require("mustache");
const Debug = require("debug");
const debug = Debug('botkit:conversation');
/**
 * An extension on the [BotBuilder Dialog Class](https://docs.microsoft.com/en-us/javascript/api/botbuilder-dialogs/dialog?view=botbuilder-ts-latest) that provides a Botkit-friendly interface for
 * defining and interacting with multi-message dialogs. Dialogs can be constructed using `say()`, `ask()` and other helper methods.
 *
 * ```javascript
 * // define the structure of your dialog...
 * const convo = new BotkitConversation('foo', controller);
 * convo.say('Hello!');
 * convo.ask('What is your name?', async(answer, convo, bot) => {
 *      await bot.say('Your name is ' + answer);
 * });
 * controller.dialogSet.add(convo);
 *
 * // later on, trigger this dialog by its id
 * controller.on('event', async(bot, message) => {
 *  await bot.beginDialog('foo');
 * })
 * ```
 */
class BotkitConversation extends botbuilder_dialogs_1.Dialog {
    /**
     * Create a new BotkitConversation object
     * @param dialogId A unique identifier for this dialog, used to later trigger this dialog
     * @param controller A pointer to the main Botkit controller
     */
    constructor(dialogId, controller) {
        super(dialogId);
        this._beforeHooks = {};
        this._afterHooks = [];
        this._changeHooks = {};
        this.script = {};
        this._controller = controller;
        // Make sure there is a prompt we can use.
        // TODO: maybe this ends up being managed by Botkit
        this._promptchoice = this.id + '_choice_prompt';
        this._controller.dialogSet.add(new botbuilder_dialogs_1.ChoicePrompt(this._promptchoice, (prompt) => Promise.resolve(true)));
        this._prompt = this.id + '_default_prompt';
        this._controller.dialogSet.add(new botbuilder_dialogs_1.ActivityPrompt(this._prompt, (prompt) => Promise.resolve(prompt.recognized.succeeded === true)));
        return this;
    }
    /**
     * Add a non-interactive message to the default thread.
     * Messages added with `say()` and `addMessage()` will _not_ wait for a response, will be sent one after another without a pause.
     *
     * [Learn more about building conversations &rarr;](../conversations.md#build-a-conversation)
     *
     * ```javascript
     * let conversation = new BotkitConversation('welcome', controller);
     * conversation.say('Hello! Welcome to my app.');
     * conversation.say('Let us get started...');
     * ```
     *
     * @param message Message template to be sent
     */
    say(message) {
        this.addMessage(message, 'default');
        return this;
    }
    /**
     * An an action to the conversation timeline. This can be used to go to switch threads or end the dialog.
     *
     * When provided the name of another thread in the conversation, this will cause the bot to go immediately
     * to that thread.
     *
     * Otherwise, use one of the following keywords:
     * * `stop`
     * * `repeat`
     * * `complete`
     * * `timeout`
     *
     * [Learn more about building conversations &rarr;](../conversations.md#build-a-conversation)
     *
     * ```javascript
     *
     * // go to a thread called "next_thread"
     * convo.addAction('next_thread');
     *
     * // end the conversation and mark as successful
     * convo.addAction('complete');
     * ```
     * @param action An action or thread name
     * @param thread_name The name of the thread to which this action is added.  Defaults to `default`
     */
    addAction(action, thread_name = 'default') {
        this.addMessage({ action: action }, thread_name);
        return this;
    }
    /**
     * Cause the dialog to call a child dialog, wait for it to complete,
     * then store the results in a variable and resume the parent dialog.
     * Use this to [combine multiple dialogs into bigger interactions.](../conversations.md#composing-dialogs)
     *
     * [Learn more about building conversations &rarr;](../conversations.md#build-a-conversation)
     * ```javascript
     * // define a profile collection dialog
     * let profileDialog = new BotkitConversation('PROFILE_DIALOG', controller);
     * profileDialog.ask('What is your name?', async(res, convo, bot) => {}, {key: 'name'});
     * profileDialog.ask('What is your age?', async(res, convo, bot) => {}, {key: 'age'});
     * profileDialog.ask('What is your location?', async(res, convo, bot) => {}, {key: 'location'});
     * controller.addDialog(profileDialog);
     *
     * let onboard = new BotkitConversation('ONBOARDING', controller);
     * onboard.say('Hello! It is time to collect your profile data.');
     * onboard.addChildDialog('PROFILE_DIALOG', 'profile');
     * onboard.say('Hello, {{vars.profile.name}}! Onboarding is complete.');
     * ```
     *
     * @param dialog_id the id of another dialog
     * @param key_name the variable name in which to store the results of the child dialog. if not provided, defaults to dialog_id.
     * @param thread_name the name of a thread to which this call should be added. defaults to 'default'
     */
    addChildDialog(dialog_id, key_name, thread_name = 'default') {
        this.addQuestion({
            action: 'beginDialog',
            execute: {
                script: dialog_id
            }
        }, [], { key: key_name || dialog_id }, thread_name);
        return this;
    }
    /**
     * Cause the current dialog to handoff to another dialog.
     * The parent dialog will not resume when the child dialog completes. However, the afterDialog event will not fire for the parent dialog until all child dialogs complete.
     * Use this to [combine multiple dialogs into bigger interactions.](../conversations.md#composing-dialogs)
     *
     * [Learn more about building conversations &rarr;](../conversations.md#build-a-conversation)
     * ```javascript
     * let parent = new BotkitConversation('parent', controller);
     * let child = new BotkitConversation('child', controller);
     * parent.say('Moving on....');
     * parent.addGotoDialog('child');
     * ```
     *
     * @param dialog_id the id of another dialog
     * @param thread_name the name of a thread to which this call should be added. defaults to 'default'
     */
    addGotoDialog(dialog_id, thread_name = 'default') {
        this.addMessage({
            action: 'execute_script',
            execute: {
                script: dialog_id
            }
        }, thread_name);
        return this;
    }
    /**
     * Add a message template to a specific thread.
     * Messages added with `say()` and `addMessage()` will be sent one after another without a pause.
     *
     * [Learn more about building conversations &rarr;](../conversations.md#build-a-conversation)
     * ```javascript
     * let conversation = new BotkitConversation('welcome', controller);
     * conversation.say('Hello! Welcome to my app.');
     * conversation.say('Let us get started...');
     * // pass in a message with an action that will cause gotoThread to be called...
     * conversation.addAction('continuation');
     *
     * conversation.addMessage('This is a different thread completely', 'continuation');
     * ```
     *
     * @param message Message template to be sent
     * @param thread_name Name of thread to which message will be added
     */
    addMessage(message, thread_name) {
        if (!thread_name) {
            thread_name = 'default';
        }
        if (!this.script[thread_name]) {
            this.script[thread_name] = [];
        }
        if (typeof (message) === 'string') {
            message = { text: [message] };
        }
        this.script[thread_name].push(message);
        return this;
    }
    /**
     * Add a question to the default thread.
     * In addition to a message template, receives either a single handler function to call when an answer is provided,
     * or an array of handlers paired with trigger patterns. When providing multiple conditions to test, developers may also provide a
     * handler marked as the default choice.
     *
     * [Learn more about building conversations &rarr;](../conversations.md#build-a-conversation)
     * ```javascript
     * // ask a question, handle the response with a function
     * convo.ask('What is your name?', async(response, convo, bot, full_message) => {
     *  await bot.say('Oh your name is ' + response);
     * }, {key: 'name'});
     *
     * // ask a question, evaluate answer, take conditional action based on response
     * convo.ask('Do you want to eat a taco?', [
     *  {
     *      pattern: 'yes',
     *      type: 'string',
     *      handler: async(response_text, convo, bot, full_message) => {
     *          return await convo.gotoThread('yes_taco');
     *      }
     *  },
     *  {
     *      pattern: 'no',
     *      type: 'string',
     *      handler: async(response_text, convo, bot, full_message) => {
     *          return await convo.gotoThread('no_taco');
     *      }
     *   },
     *   {
     *       default: true,
     *       handler: async(response_text, convo, bot, full_message) => {
     *           await bot.say('I do not understand your response!');
     *           // start over!
     *           return await convo.repeat();
     *       }
     *   }
     * ], {key: 'tacos'});
     * ```
     *
     * @param message a message that will be used as the prompt
     * @param handlers one or more handler functions defining possible conditional actions based on the response to the question.
     * @param key name of variable to store response in.
     */
    ask(message, handlers, key) {
        this.addQuestion(message, handlers, key, 'default');
        return this;
    }
    /**
     * Identical to [ask()](#ask), but accepts the name of a thread to which the question is added.
     *
     * [Learn more about building conversations &rarr;](../conversations.md#build-a-conversation)
     * @param message A message that will be used as the prompt
     * @param handlers One or more handler functions defining possible conditional actions based on the response to the question
     * @param key Name of variable to store response in.
     * @param thread_name Name of thread to which message will be added
     */
    addQuestion(message, handlers, key, thread_name) {
        if (!thread_name) {
            thread_name = 'default';
        }
        if (!this.script[thread_name]) {
            this.script[thread_name] = [];
        }
        if (typeof (message) === 'string') {
            message = { text: [message] };
        }
        message.collect = {};
        if (key) {
            message.collect = {
                key: typeof (key) === 'string' ? key : key.key
            };
        }
        if (Array.isArray(handlers)) {
            message.collect.options = handlers;
        }
        else if (typeof (handlers) === 'function') {
            message.collect.options = [
                {
                    default: true,
                    handler: handlers
                }
            ];
        }
        else {
            throw new Error('Unsupported handlers type: ' + typeof (handlers));
        }
        // ensure all options have a type field
        message.collect.options.forEach((o) => { if (!o.type) {
            o.type = 'string';
        } });
        this.script[thread_name].push(message);
        // add a null message where the handlers for the previous message will fire.
        this.script[thread_name].push({ action: 'next' });
        return this;
    }
    /**
     * Register a handler function that will fire before a given thread begins.
     * Use this hook to set variables, call APIs, or change the flow of the conversation using `convo.gotoThread`
     *
     * ```javascript
     * convo.addMessage('This is the foo thread: var == {{vars.foo}}', 'foo');
     * convo.before('foo', async(convo, bot) => {
     *  // set a variable here that can be used in the message template
     *  convo.setVar('foo','THIS IS FOO');
     *
     * });
     * ```
     *
     * @param thread_name A valid thread defined in this conversation
     * @param handler A handler function in the form async(convo, bot) => { ... }
     */
    before(thread_name, handler) {
        if (!this._beforeHooks[thread_name]) {
            this._beforeHooks[thread_name] = [];
        }
        this._beforeHooks[thread_name].push(handler);
    }
    /**
     * This private method is called before a thread begins, and causes any bound handler functions to be executed.
     * @param thread_name the thread about to begin
     * @param dc the current DialogContext
     * @param step the current step object
     */
    runBefore(thread_name, dc, step) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('Before:', this.id, thread_name);
            if (this._beforeHooks[thread_name]) {
                // spawn a bot instance so devs can use API or other stuff as necessary
                const bot = yield this._controller.spawn(dc);
                // create a convo controller object
                const convo = new dialogWrapper_1.BotkitDialogWrapper(dc, step);
                for (let h = 0; h < this._beforeHooks[thread_name].length; h++) {
                    const handler = this._beforeHooks[thread_name][h];
                    yield handler.call(this, convo, bot);
                }
            }
        });
    }
    /**
     * Bind a function to run after the dialog has completed.
     * The first parameter to the handler will include a hash of all variables set and values collected from the user during the conversation.
     * The second parameter to the handler is a BotWorker object that can be used to start new dialogs or take other actions.
     *
     * [Learn more about handling end of conversation](../conversations.md#handling-end-of-conversation)
     * ```javascript
     * let convo = new BotkitConversation(MY_CONVO, controller);
     * convo.ask('What is your name?', [], 'name');
     * convo.ask('What is your age?', [], 'age');
     * convo.ask('What is your favorite color?', [], 'color');
     * convo.after(async(results, bot) => {
     *
     *      // handle results.name, results.age, results.color
     *
     * });
     * controller.addDialog(convo);
     * ```
     *
     * @param handler in the form async(results, bot) { ... }
     */
    after(handler) {
        this._afterHooks.push(handler);
    }
    /**
     * This private method is called at the end of the conversation, and causes any bound handler functions to be executed.
     * @param context the current dialog context
     * @param results an object containing the final results of the dialog
     */
    runAfter(context, results) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('After:', this.id);
            if (this._afterHooks.length) {
                const bot = yield this._controller.spawn(context);
                for (let h = 0; h < this._afterHooks.length; h++) {
                    const handler = this._afterHooks[h];
                    yield handler.call(this, results, bot);
                }
            }
        });
    }
    /**
     * Bind a function to run whenever a user answers a specific question.  Can be used to validate input and take conditional actions.
     *
     * ```javascript
     * convo.ask('What is your name?', [], 'name');
     * convo.onChange('name', async(response, convo, bot) => {
     *
     *  // user changed their name!
     *  // do something...
     *
     * });
     * ```
     * @param variable name of the variable to watch for changes
     * @param handler a handler function that will fire whenever a user's response is used to change the value of the watched variable
     */
    onChange(variable, handler) {
        if (!this._changeHooks[variable]) {
            this._changeHooks[variable] = [];
        }
        this._changeHooks[variable].push(handler);
    }
    /**
     * This private method is responsible for firing any bound onChange handlers when a variable changes
     * @param variable the name of the variable that is changing
     * @param value the new value of the variable
     * @param dc the current DialogContext
     * @param step the current step object
     */
    runOnChange(variable, value, dc, step) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('OnChange:', this.id, variable, value);
            if (this._changeHooks[variable] && this._changeHooks[variable].length) {
                // spawn a bot instance so devs can use API or other stuff as necessary
                const bot = yield this._controller.spawn(dc);
                // create a convo controller object
                const convo = new dialogWrapper_1.BotkitDialogWrapper(dc, step);
                for (let h = 0; h < this._changeHooks[variable].length; h++) {
                    const handler = this._changeHooks[variable][h];
                    yield handler.call(this, (typeof (value) === 'object') ? value.value : value, convo, bot);
                }
            }
        });
    }
    /**
     * Called automatically when a dialog begins. Do not call this directly!
     * @ignore
     * @param dc the current DialogContext
     * @param options an object containing initialization parameters passed to the dialog. may include `thread` which will cause the dialog to begin with that thread instead of the `default` thread.
     */
    beginDialog(dc, options) {
        return __awaiter(this, void 0, void 0, function* () {
            // Initialize the state
            const state = dc.activeDialog.state;
            state.options = options || {};
            state.values = Object.assign({}, options);
            // Run the first step
            return yield this.runStep(dc, 0, state.options.thread || 'default', botbuilder_dialogs_1.DialogReason.beginCalled);
        });
    }
    /**
     * Called automatically when an already active dialog is continued. Do not call this directly!
     * @ignore
     * @param dc the current DialogContext
     */
    continueDialog(dc) {
        return __awaiter(this, void 0, void 0, function* () {
            // Don't do anything for non-message activities
            if (dc.context.activity.type !== botbuilder_1.ActivityTypes.Message) {
                return botbuilder_dialogs_1.Dialog.EndOfTurn;
            }
            // Run next step with the message text as the result.
            return yield this.resumeDialog(dc, botbuilder_dialogs_1.DialogReason.continueCalled, dc.context.activity);
        });
    }
    /**
     * Called automatically when a dialog moves forward a step. Do not call this directly!
     * @ignore
     * @param dc The current DialogContext
     * @param reason Reason for resuming the dialog
     * @param result Result of previous step
     */
    resumeDialog(dc, reason, result) {
        return __awaiter(this, void 0, void 0, function* () {
            // Increment step index and run step
            if (dc.activeDialog) {
                const state = dc.activeDialog.state;
                return yield this.runStep(dc, state.stepIndex + 1, state.thread || 'default', reason, result);
            }
            else {
                return botbuilder_dialogs_1.Dialog.EndOfTurn;
            }
        });
    }
    /**
     * Called automatically to process the turn, interpret the script, and take any necessary actions based on that script. Do not call this directly!
     * @ignore
     * @param dc The current dialog context
     * @param step The current step object
     */
    onStep(dc, step) {
        return __awaiter(this, void 0, void 0, function* () {
            // Let's interpret the current line of the script.
            const thread = this.script[step.thread];
            step.result = (typeof (step.result) === 'object' && step.result !== null) ? step.result.value : step.result;
            if (!thread) {
                throw new Error(`Thread '${step.thread}' not found, did you add any messages to it?`);
            }
            // Capture the previous step value if there previous line included a prompt
            const previous = (step.index >= 1) ? thread[step.index - 1] : null;
            if (step.result && previous && previous.collect) {
                if (previous.collect.key) {
                    // capture before values
                    const index = step.index;
                    const thread_name = step.thread;
                    // capture the user input value into the array
                    if (step.values[previous.collect.key] && previous.collect.multiple) {
                        step.values[previous.collect.key] = [step.values[previous.collect.key], step.result].join('\n');
                    }
                    else {
                        step.values[previous.collect.key] = step.result;
                    }
                    // run onChange handlers
                    yield this.runOnChange(previous.collect.key, step.result, dc, step);
                    // did we just change threads? if so, restart this turn
                    if (index !== step.index || thread_name !== step.thread) {
                        return yield this.runStep(dc, step.index, step.thread, botbuilder_dialogs_1.DialogReason.nextCalled);
                    }
                }
                // handle conditions of previous step
                if (previous.collect.options) {
                    const paths = previous.collect.options.filter((option) => { return !option.default === true; });
                    const default_path = previous.collect.options.filter((option) => { return option.default === true; })[0];
                    let path = null;
                    for (let p = 0; p < paths.length; p++) {
                        const condition = paths[p];
                        let test;
                        if (condition.type === 'string') {
                            test = new RegExp(condition.pattern, 'i');
                        }
                        else if (condition.type === 'regex') {
                            test = new RegExp(condition.pattern, 'i');
                        }
                        // TODO: Allow functions to be passed in as patterns
                        // ie async(test) => Promise<boolean>
                        if (step.result && typeof (step.result) === 'string' && step.result.match(test)) {
                            path = condition;
                            break;
                        }
                    }
                    // take default path if one is set
                    if (!path) {
                        path = default_path;
                    }
                    if (path) {
                        if (path.action !== 'wait' && previous.collect && previous.collect.multiple) {
                            // TODO: remove the final line of input
                            // since this would represent the "end" message and probably not part of the input
                        }
                        const res = yield this.handleAction(path, dc, step);
                        if (res !== false) {
                            return res;
                        }
                    }
                }
            }
            // was the dialog canceled during the last action?
            if (!dc.activeDialog) {
                return yield this.end(dc);
            }
            // Handle the current step
            if (step.index < thread.length) {
                const line = thread[step.index];
                // If a prompt is defined in the script, use dc.prompt to call it.
                // This prompt must be a valid dialog defined somewhere in your code!
                if (line.collect && line.action !== 'beginDialog') {
                    try {
                        const madeoutgoing = yield this.makeOutgoing(dc, line, step.values);
                        if (madeoutgoing.channelData.quick_replies && step.state.options.channel && (step.state.options.channel.indexOf('whatsapp') !== -1)) {
                            const choiceArray = madeoutgoing.channelData.quick_replies.map(x => {
                                switch (x.content_type) {
                                    case 'text':
                                        return {
                                            value: x.payload,
                                            action: {
                                                type: 'postback',
                                                title: x.title,
                                                //value: x.payload
                                            },
                                            //synonyms: [x.title]
                                        };
                                        break;
                                    case 'user_email':
                                        return {
                                            value: x.content_type,
                                            action: {
                                                type: 'postback',
                                                title: x.title,
                                                //value: x.content_type
                                            },
                                            synonyms: ['user_email']
                                        };
                                        break;
                                    default:
                                        break;
                                }
                            });
                            //const choicePromptOptions = ChoiceFactory.forChannel(dc.context, choiceArray, madeoutgoing.text);
                            const promptOptions = {
                                prompt: madeoutgoing.text,
                                choices: botbuilder_dialogs_1.ChoiceFactory.toChoices(choiceArray),
                                style: botbuilder_dialogs_1.ListStyle.list
                                // You can also include a retry prompt if you like,
                                // but there's no need to include the choices property in a text prompt
                            };
                            return yield dc.prompt(this._promptchoice, promptOptions);
                        }
                        else {
                            return yield dc.prompt(this._prompt, yield madeoutgoing);
                        }
                    }
                    catch (err) {
                        console.error(err);
                        yield dc.context.sendActivity(`Failed to start prompt ${this._prompt}`);
                        return yield step.next();
                    }
                    // If there's nothing but text, send it!
                    // This could be extended to include cards and other activity attributes.
                }
                else {
                    // if there is text, attachments, or any channel data fields at all...
                    if (line.type || line.text || line.attachments || line.attachment || line.blocks || (line.channelData && Object.keys(line.channelData).length)) {
                        const madeoutgoing = yield this.makeOutgoing(dc, line, step.values);
                        if ((step.state.options.channel.indexOf('whatsapp') !== -1) && madeoutgoing.attachments && madeoutgoing.attachmentLayout && madeoutgoing.attachmentLayout == 'carousel') {
                            try {
                                let lastbutton = 0;
                                const madeoutgoingsingle = JSON.parse(JSON.stringify(madeoutgoing));
                                for (let attid = 0; attid < madeoutgoing.attachments.length; attid++) {
                                    madeoutgoingsingle.attachments = madeoutgoing.attachments.slice(attid, attid + 1);
                                    madeoutgoingsingle.attachments[0].name = madeoutgoingsingle.attachments[0].content.buttons.length + lastbutton;
                                    madeoutgoingsingle.channelData.attachment.payload.elements = madeoutgoing.channelData.attachment.payload.elements.slice(attid, attid + 1);
                                    madeoutgoingsingle.channelData.attachments = madeoutgoing.channelData.attachments.slice(attid, attid + 1);
                                    madeoutgoingsingle.channelData.attachments[0].name = madeoutgoingsingle.channelData.attachments[0].content.buttons.length + lastbutton;
                                    lastbutton = madeoutgoingsingle.attachments[0].name;
                                    yield dc.context.sendActivity(madeoutgoingsingle);
                                }
                                /*madeoutgoing.attachments.forEach(attachment => {
                                    let message_body = `*${attachment.content.title}*\n_${attachment.content.subtitle}_\n`;
                                    attachment.content.buttons.forEach(button => {
                                        message_body += `\n${butc}.${button.title}`;
                                        butc++;
                                    });
                                    yield dc.context.sendActivity(madeoutgoing);
                                });*/
                                const choiceArray = madeoutgoing.attachments.map(hc => {
                                    switch (hc.contentType) {
                                        case 'application/vnd.microsoft.card.hero':
                                            return hc.content.buttons.map(b => {
                                                return {
                                                    value: b.value,
                                                    action: {
                                                        type: 'postback',
                                                        title: b.title,
                                                        //value: x.payload
                                                    },
                                                    //synonyms: [x.title]
                                                };
                                            });
                                            break;
                                        case 'user_email':
                                            return {
                                                value: hc.content_type,
                                                action: {
                                                    type: 'postback',
                                                    title: hc.title,
                                                    //value: x.content_type
                                                },
                                                synonyms: ['user_email']
                                            };
                                            break;
                                        default:
                                            break;
                                    }
                                });
                                const choiceArrayFlat = choiceArray.flat();
                                //const choicePromptOptions = ChoiceFactory.forChannel(dc.context, choiceArray, madeoutgoing.text);
                                const promptOptions = {
                                    prompt: 'Merci de faire votre choix :',
                                    choices: botbuilder_dialogs_1.ChoiceFactory.toChoices(choiceArrayFlat),
                                    style: botbuilder_dialogs_1.ListStyle.list
                                    // You can also include a retry prompt if you like,
                                    // but there's no need to include the choices property in a text prompt
                                };
                                return yield dc.prompt(this._promptchoice, promptOptions);
                            }
                            catch (err) {
                                console.error(err);
                                yield dc.context.sendActivity(`Failed to start prompt ${this._prompt}`);
                                return yield step.next();
                            }
                        }
                        else if (madeoutgoing.attachments && madeoutgoing.attachmentLayout && madeoutgoing.attachmentLayout == 'carousel' && madeoutgoing.attachments.length >= 4) {
                            // Break long carousel to multiline
                            const row = Math.ceil(Math.sqrt(madeoutgoing.attachments.length));
                            const madeoutgoingCopy = Object.assign({}, madeoutgoing);
                            for (let turn = 0; turn < row && row <= 10; turn++) {
                                if (turn == row - 1) {
                                    madeoutgoingCopy.attachments = madeoutgoing.attachments.slice(turn * row);
                                    if (madeoutgoingCopy.attachments.length) {
                                        yield dc.context.sendActivity(madeoutgoingCopy);
                                    }
                                }
                                else {
                                    madeoutgoingCopy.attachments = madeoutgoing.attachments.slice(turn * row, turn * row + row);
                                    yield dc.context.sendActivity(madeoutgoingCopy);
                                }
                            }
                        }
                        else {
                            // sendActivity as usual
                            yield dc.context.sendActivity(madeoutgoing);
                        }
                    }
                    else if (!line.action) {
                        console.error('Dialog contains invalid message', line);
                    }
                    if (line.action) {
                        const res = yield this.handleAction(line, dc, step);
                        if (res !== false) {
                            return res;
                        }
                    }
                    return yield step.next();
                }
            }
            else {
                // End of script so just return to parent
                return yield this.end(dc);
            }
        });
    }
    /**
     * Run a dialog step, based on the index and thread_name passed in.
     * @param dc The current DialogContext
     * @param index The index of the current step
     * @param thread_name The name of the current thread
     * @param reason The reason given for running this step
     * @param result The result of the previous turn if any
     */
    runStep(dc, index, thread_name, reason, result) {
        return __awaiter(this, void 0, void 0, function* () {
            // Update the step index
            const state = dc.activeDialog.state;
            state.stepIndex = index;
            state.thread = thread_name;
            // Create step context
            const nextCalled = false;
            const step = {
                index: index,
                threadLength: this.script[thread_name].length,
                thread: thread_name,
                state: state,
                options: state.options,
                reason: reason,
                result: result && result.text ? result.text : result,
                resultObject: result,
                values: state.values,
                next: (stepResult) => __awaiter(this, void 0, void 0, function* () {
                    if (nextCalled) {
                        throw new Error(`ScriptedStepContext.next(): method already called for dialog and step '${this.id}[${index}]'.`);
                    }
                    return yield this.resumeDialog(dc, botbuilder_dialogs_1.DialogReason.nextCalled, stepResult);
                })
            };
            // did we just start a new thread?
            // if so, run the before stuff.
            if (index === 0) {
                yield this.runBefore(step.thread, dc, step);
                // did we just change threads? if so, restart
                if (index !== step.index || thread_name !== step.thread) {
                    return yield this.runStep(dc, step.index, step.thread, botbuilder_dialogs_1.DialogReason.nextCalled); // , step.values);
                }
            }
            // Execute step
            const res = yield this.onStep(dc, step);
            return res;
        });
    }
    /**
     * Automatically called when the the dialog ends and causes any handlers bound using `after()` to fire. Do not call this directly!
     * @ignore
     * @param dc The current DialogContext
     * @param value The final value collected by the dialog.
     */
    end(dc) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: may have to move these around
            // shallow copy todo: may need deep copy
            // protect against canceled dialog.
            if (dc.activeDialog && dc.activeDialog.state) {
                const result = Object.assign({}, dc.activeDialog.state.values);
                yield dc.endDialog(result);
                yield this.runAfter(dc, result);
            }
            else {
                yield dc.endDialog();
            }
            return botbuilder_dialogs_1.DialogTurnStatus.complete;
        });
    }
    /**
     * Translates a line from the dialog script into an Activity. Responsible for doing token replacement.
     * @param line a message template from the script
     * @param vars an object containing key/value pairs used to do token replacement on fields in the message template
     */
    makeOutgoing(dc, line, vars) {
        return __awaiter(this, void 0, void 0, function* () {
            let outgoing;
            let text = '';
            // if the text is just a string, use it.
            // otherwise, if it is an array, pick a random element
            if (line.text && typeof (line.text) === 'string') {
                text = line.text;
                // If text is a function, call the function to get the actual text value.
            }
            else if (line.text && typeof (line.text) === 'function') {
                text = yield line.text(line, vars);
            }
            else if (Array.isArray(line.text)) {
                text = line.text[Math.floor(Math.random() * line.text.length)];
            }
            /*******************************************************************************************************************/
            // use Bot Framework's message factory to construct the initial object.
            if (line.quick_replies && typeof (line.quick_replies) !== 'function') {
                outgoing = botbuilder_1.MessageFactory.suggestedActions(line.quick_replies.map((reply) => { return { type: botbuilder_1.ActionTypes.PostBack, title: reply.title, text: reply.payload, displayText: reply.title, value: reply.payload }; }), text);
            }
            else {
                outgoing = botbuilder_1.MessageFactory.text(text);
            }
            outgoing.channelData = outgoing.channelData ? outgoing.channelData : {};
            if (line.attachmentLayout) {
                outgoing.attachmentLayout = line.attachmentLayout;
            }
            /*******************************************************************************************************************/
            // allow dynamic generation of quick replies and/or attachments
            if (typeof (line.quick_replies) === 'function') {
                // set both formats of quick replies
                outgoing.channelData.quick_replies = yield line.quick_replies(line, vars);
                outgoing.suggestedActions = { actions: outgoing.channelData.quick_replies.map((reply) => { return { type: botbuilder_1.ActionTypes.PostBack, title: reply.title, text: reply.payload, displayText: reply.title, value: reply.payload }; }) };
            }
            if (typeof (line.attachment) === 'function') {
                outgoing.channelData.attachment = yield line.attachment(line, vars);
            }
            if (typeof (line.attachments) === 'function') {
                // set both locations for attachments
                outgoing.attachments = outgoing.channelData.attachments = yield line.attachments(line, vars);
            }
            if (typeof (line.blocks) === 'function') {
                outgoing.channelData.blocks = yield line.blocks(line, vars);
            }
            /*******************************************************************************************************************/
            // Map some fields into the appropriate places for processing by Botkit/ Bot Framework
            // Quick replies are used by Facebook and Web adapters, but in a different way than they are for Bot Framework.
            // In order to make this as easy as possible, copy these fields for the developer into channelData.
            if (line.quick_replies && typeof (line.quick_replies) !== 'function') {
                outgoing.channelData.quick_replies = JSON.parse(JSON.stringify(line.quick_replies));
            }
            // Similarly, attachment and blocks fields are platform specific.
            // handle slack Block attachments
            if (line.blocks && typeof (line.blocks) !== 'function') {
                outgoing.channelData.blocks = JSON.parse(JSON.stringify(line.blocks));
            }
            // handle facebook attachments.
            if (line.attachment && typeof (line.attachment) !== 'function') {
                outgoing.channelData.attachment = JSON.parse(JSON.stringify(line.attachment));
            }
            // set the type
            if (line.type) {
                if (line.type === 'delay')
                    outgoing.value = typeof line.value === 'number' ? line.value : 1000;
                outgoing.type = JSON.parse(JSON.stringify(line.type));
            }
            // copy all the values in channelData fields
            if (line.channelData && Object.keys(line.channelData).length > 0) {
                const channelDataParsed = this.parseTemplatesRecursive(JSON.parse(JSON.stringify(line.channelData)), vars);
                outgoing.channelData = Object.assign(Object.assign({}, outgoing.channelData), channelDataParsed);
            }
            /*******************************************************************************************************************/
            // Handle template token replacements
            if (outgoing.text) {
                outgoing.text = mustache.render(outgoing.text, { vars: vars });
            }
            // process templates in native botframework attachments and/or slack attachments
            if (line.attachments && typeof (line.attachments) !== 'function') {
                outgoing.attachments = this.parseTemplatesRecursive(JSON.parse(JSON.stringify(line.attachments)), vars);
            }
            // process templates in slack attachments in channelData
            if (outgoing.channelData.attachments) {
                outgoing.channelData.attachments = this.parseTemplatesRecursive(outgoing.channelData.attachments, vars);
            }
            if (outgoing.channelData.blocks) {
                outgoing.channelData.blocks = this.parseTemplatesRecursive(outgoing.channelData.blocks, vars);
            }
            // process templates in facebook attachments
            if (outgoing.channelData.attachment) {
                outgoing.channelData.attachment = this.parseTemplatesRecursive(outgoing.channelData.attachment, vars);
            }
            // process templates in quick replies
            if (outgoing.channelData.quick_replies) {
                outgoing.channelData.quick_replies = this.parseTemplatesRecursive(outgoing.channelData.quick_replies, vars);
            }
            // process templates in quick replies
            if (outgoing.suggestedActions) {
                outgoing.suggestedActions = this.parseTemplatesRecursive(outgoing.suggestedActions, vars);
            }
            return new Promise((resolve, reject) => {
                // run the outgoing message through the Botkit send middleware
                this._controller.spawn(dc).then((bot) => {
                    this._controller.middleware.send.run(bot, outgoing, (err, bot, outgoing) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve(outgoing);
                        }
                    });
                }).catch(reject);
            });
        });
    }
    /**
     * Responsible for doing token replacements recursively in attachments and other multi-field properties of the message.
     * @param attachments some object or array containing values for which token replacements should be made.
     * @param vars an object defining key/value pairs used for the token replacements
     */
    parseTemplatesRecursive(attachments, vars) {
        if (attachments && attachments.length) {
            for (let a = 0; a < attachments.length; a++) {
                for (const key in attachments[a]) {
                    if (typeof (attachments[a][key]) === 'string') {
                        attachments[a][key] = mustache.render(attachments[a][key], { vars: vars });
                    }
                    else {
                        attachments[a][key] = this.parseTemplatesRecursive(attachments[a][key], vars);
                    }
                }
            }
        }
        else {
            for (const x in attachments) {
                if (typeof (attachments[x]) === 'string') {
                    attachments[x] = mustache.render(attachments[x], { vars: vars });
                }
                else {
                    attachments[x] = this.parseTemplatesRecursive(attachments[x], vars);
                }
            }
        }
        return attachments;
    }
    /**
     * Handle the scripted "gotothread" action - requires an additional call to runStep.
     * @param thread The name of the thread to jump to
     * @param dc The current DialogContext
     * @param step The current step object
     */
    gotoThreadAction(thread, dc, step) {
        return __awaiter(this, void 0, void 0, function* () {
            step.thread = thread;
            step.index = 0;
            return yield this.runStep(dc, step.index, step.thread, botbuilder_dialogs_1.DialogReason.nextCalled, step.values);
        });
    }
    /**
     * Accepts a Botkit script action, and performs that action
     * @param path A conditional path in the form {action: 'some action', handler?: some handler function, maybe_other_fields}
     * @param dc The current DialogContext
     * @param step The current stpe object
     */
    handleAction(path, dc, step) {
        return __awaiter(this, void 0, void 0, function* () {
            let worker = null;
            if (path.handler) {
                const index = step.index;
                const thread_name = step.thread;
                const result = step.result;
                const response = result == null ? null : (result.text || (typeof (result) === 'string' ? result : null));
                // spawn a bot instance so devs can use API or other stuff as necessary
                const bot = yield this._controller.spawn(dc);
                // create a convo controller object
                const convo = new dialogWrapper_1.BotkitDialogWrapper(dc, step);
                const activedialog = dc.activeDialog.id;
                yield path.handler.call(this, response, convo, bot, dc.context.turnState.get('botkitMessage') || dc.context.activity);
                if (!dc.activeDialog) {
                    return false;
                }
                // did we change dialogs? if so, return an endofturn because the new dialog has taken over.
                if (activedialog !== dc.activeDialog.id) {
                    return botbuilder_dialogs_1.Dialog.EndOfTurn;
                }
                // did we just change threads? if so, restart this turn
                if (index !== step.index || thread_name !== step.thread) {
                    return yield this.runStep(dc, step.index, step.thread, botbuilder_dialogs_1.DialogReason.nextCalled, null);
                }
                return false;
            }
            switch (path.action) {
                case 'next':
                    // noop
                    break;
                case 'complete':
                    step.values._status = 'completed';
                    return yield this.end(dc);
                case 'stop':
                    step.values._status = 'canceled';
                    return yield this.end(dc);
                case 'timeout':
                    step.values._status = 'timeout';
                    return yield this.end(dc);
                case 'execute_script':
                    worker = yield this._controller.spawn(dc);
                    yield worker.replaceDialog(path.execute.script, Object.assign({ thread: path.execute.thread }, step.values));
                    return { status: botbuilder_dialogs_1.DialogTurnStatus.waiting };
                case 'beginDialog':
                    worker = yield this._controller.spawn(dc);
                    yield worker.beginDialog(path.execute.script, Object.assign({ thread: path.execute.thread }, step.values));
                    return { status: botbuilder_dialogs_1.DialogTurnStatus.waiting };
                case 'repeat':
                    return yield this.runStep(dc, step.index - 1, step.thread, botbuilder_dialogs_1.DialogReason.nextCalled);
                case 'wait':
                    // reset the state so we're still on this step.
                    step.state.stepIndex = step.index - 1;
                    // send a waiting status
                    return { status: botbuilder_dialogs_1.DialogTurnStatus.waiting };
                default:
                    // the default behavior for unknown action in botkit is to gotothread
                    if (this.script[path.action]) {
                        return yield this.gotoThreadAction(path.action, dc, step);
                    }
                    console.warn('NOT SURE WHAT TO DO WITH THIS!!', path);
                    break;
            }
            return false;
        });
    }
}
exports.BotkitConversation = BotkitConversation;
//# sourceMappingURL=conversation.js.map