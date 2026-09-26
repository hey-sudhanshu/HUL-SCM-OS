"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGovernanceStore = void 0;
var zustand_1 = require("zustand");
var governance_1 = require("./governance");
exports.useGovernanceStore = (0, zustand_1.create)(function (set, get) { return ({
    matrix: JSON.parse(JSON.stringify(governance_1.DEFAULT_RACI)),
    currentRole: 'Supply Chain Director',
    queue: [],
    auditLog: [],
    setMatrix: function (matrix) { return set({ matrix: matrix }); },
    setCurrentRole: function (role) { return set({ currentRole: role }); },
    enqueue: function (decision, originating_app, payload, before_kpis, after_kpis) {
        var state = get();
        // Usually enqueued by the AI Agent or another role "recommending" it.
        var perm = (0, governance_1.check_raci_permission)(state.matrix, state.currentRole, decision, 'recommend');
        if (!perm.allowed) {
            // Log denial
            var denialId_1 = Math.random().toString(36).substr(2, 9);
            set(function (s) { return ({
                auditLog: __spreadArray(__spreadArray([], s.auditLog, true), [{ id: denialId_1, timestamp: Date.now(), actor: state.currentRole, action: 'enqueue_denied', details: "Denied enqueue of ".concat(decision, ": ").concat(perm.reason) }], false)
            }); });
            return { success: false, reason: perm.reason };
        }
        var id = Math.random().toString(36).substr(2, 9);
        // Who needs to approve? The 'A'
        var required_approver;
        for (var _i = 0, _a = Object.entries(state.matrix[decision]); _i < _a.length; _i++) {
            var _b = _a[_i], r = _b[0], a = _b[1];
            if (a === 'A')
                required_approver = r;
        }
        var item = {
            id: id,
            decision: decision,
            originating_app: originating_app,
            payload: payload,
            before_kpis: before_kpis,
            after_kpis: after_kpis,
            required_approver: required_approver,
            status: 'pending',
            timestamp: Date.now()
        };
        set(function (s) { return ({
            queue: __spreadArray(__spreadArray([], s.queue, true), [item], false),
            auditLog: __spreadArray(__spreadArray([], s.auditLog, true), [{ id: Math.random().toString(36).substr(2, 9), timestamp: Date.now(), actor: state.currentRole, action: 'enqueue', details: "Enqueued ".concat(decision, " from ").concat(originating_app) }], false)
        }); });
        return { success: true };
    },
    processQueueItem: function (id, action, commitCallback) {
        var state = get();
        var item = state.queue.find(function (q) { return q.id === id; });
        if (!item)
            return { success: false, reason: 'Item not found' };
        if (item.status !== 'pending')
            return { success: false, reason: "Item already ".concat(item.status) };
        var perm = (0, governance_1.check_raci_permission)(state.matrix, state.currentRole, item.decision, 'commit');
        if (!perm.allowed) {
            // Log unauthorized approval attempt
            set(function (s) { return ({
                auditLog: __spreadArray(__spreadArray([], s.auditLog, true), [{ id: Math.random().toString(36).substr(2, 9), timestamp: Date.now(), actor: state.currentRole, action: 'unauthorized_commit_attempt', details: "Tried to ".concat(action, " ").concat(item.decision, ": ").concat(perm.reason) }], false)
            }); });
            return { success: false, reason: perm.reason };
        }
        // Process it
        var newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'modified';
        if (newStatus === 'approved' && commitCallback) {
            commitCallback(); // Actually execute the side effect
        }
        set(function (s) { return ({
            queue: s.queue.map(function (q) { return q.id === id ? __assign(__assign({}, q), { status: newStatus }) : q; }),
            auditLog: __spreadArray(__spreadArray([], s.auditLog, true), [{ id: Math.random().toString(36).substr(2, 9), timestamp: Date.now(), actor: state.currentRole, action: "commit_".concat(newStatus), details: "".concat(newStatus, " ").concat(item.decision, " from ").concat(item.originating_app) }], false)
        }); });
        return { success: true, reason: "Successfully ".concat(newStatus) };
    }
}); });
