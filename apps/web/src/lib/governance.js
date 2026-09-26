"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_RACI = void 0;
exports.validate_raci = validate_raci;
exports.check_raci_permission = check_raci_permission;
exports.DEFAULT_RACI = {
    'approve reorder': { 'Demand Planner': '', 'Inventory Planner': 'R', 'Warehouse Manager': 'I', 'Logistics Head': '', 'Procurement Head': 'A', 'Supply Chain Director': 'I', 'AI Agent': 'C' },
    'change safety-stock policy': { 'Demand Planner': 'C', 'Inventory Planner': 'R', 'Warehouse Manager': 'I', 'Logistics Head': '', 'Procurement Head': '', 'Supply Chain Director': 'A', 'AI Agent': 'C' },
    'shift a distributor cluster': { 'Demand Planner': '', 'Inventory Planner': 'I', 'Warehouse Manager': 'R', 'Logistics Head': 'A', 'Procurement Head': '', 'Supply Chain Director': 'I', 'AI Agent': 'C' },
    'approve dispatch plan': { 'Demand Planner': '', 'Inventory Planner': '', 'Warehouse Manager': 'I', 'Logistics Head': 'R', 'Procurement Head': '', 'Supply Chain Director': 'A', 'AI Agent': 'C' },
    'change truck class mix': { 'Demand Planner': '', 'Inventory Planner': '', 'Warehouse Manager': 'C', 'Logistics Head': 'A', 'Procurement Head': '', 'Supply Chain Director': 'I', 'AI Agent': 'R' },
    'approve new hub': { 'Demand Planner': 'C', 'Inventory Planner': 'C', 'Warehouse Manager': 'C', 'Logistics Head': 'R', 'Procurement Head': 'I', 'Supply Chain Director': 'A', 'AI Agent': 'C' },
    'change sourcing strategy': { 'Demand Planner': 'I', 'Inventory Planner': 'I', 'Warehouse Manager': '', 'Logistics Head': '', 'Procurement Head': 'A', 'Supply Chain Director': 'R', 'AI Agent': 'C' },
    'approve a forecast override': { 'Demand Planner': 'R', 'Inventory Planner': 'I', 'Warehouse Manager': '', 'Logistics Head': '', 'Procurement Head': '', 'Supply Chain Director': 'A', 'AI Agent': 'C' },
    'run a simulation': { 'Demand Planner': 'I', 'Inventory Planner': 'I', 'Warehouse Manager': 'I', 'Logistics Head': 'I', 'Procurement Head': 'I', 'Supply Chain Director': 'A', 'AI Agent': 'R' },
    'generate a report': { 'Demand Planner': 'I', 'Inventory Planner': 'I', 'Warehouse Manager': 'I', 'Logistics Head': 'I', 'Procurement Head': 'I', 'Supply Chain Director': 'A', 'AI Agent': 'R' },
    'adjust cost parameters': { 'Demand Planner': '', 'Inventory Planner': '', 'Warehouse Manager': 'I', 'Logistics Head': 'R', 'Procurement Head': 'C', 'Supply Chain Director': 'A', 'AI Agent': 'C' },
    'approve emergency reroute': { 'Demand Planner': '', 'Inventory Planner': 'I', 'Warehouse Manager': 'C', 'Logistics Head': 'A', 'Procurement Head': '', 'Supply Chain Director': 'I', 'AI Agent': 'R' },
    'close a risk': { 'Demand Planner': 'I', 'Inventory Planner': 'I', 'Warehouse Manager': 'I', 'Logistics Head': 'I', 'Procurement Head': 'R', 'Supply Chain Director': 'A', 'AI Agent': 'C' },
    'approve supplier switch': { 'Demand Planner': '', 'Inventory Planner': 'C', 'Warehouse Manager': 'I', 'Logistics Head': 'I', 'Procurement Head': 'R', 'Supply Chain Director': 'A', 'AI Agent': 'C' },
};
function validate_raci(matrix) {
    var errors = [];
    for (var _i = 0, _a = Object.entries(matrix); _i < _a.length; _i++) {
        var _b = _a[_i], decision = _b[0], roles = _b[1];
        var aCount = 0;
        var rCount = 0;
        for (var _c = 0, _d = Object.entries(roles); _c < _d.length; _c++) {
            var _e = _d[_c], role = _e[0], assignment = _e[1];
            if (assignment === 'A')
                aCount++;
            if (assignment === 'R')
                rCount++;
            if (role === 'AI Agent' && assignment === 'A') {
                errors.push("AI Agent cannot be A (Accountable) for ".concat(decision));
            }
        }
        if (aCount !== 1) {
            errors.push("".concat(decision, " must have exactly one A (has ").concat(aCount, ")"));
        }
        if (rCount < 1) {
            errors.push("".concat(decision, " must have at least one R (has ").concat(rCount, ")"));
        }
    }
    return { valid: errors.length === 0, errors: errors };
}
function check_raci_permission(matrix, role, decision, action) {
    var assignment = matrix[decision][role];
    // AI Agent logic
    if (role === 'AI Agent') {
        if (action === 'commit') {
            return { allowed: false, reason: "AI Agent is never allowed to commit." };
        }
        if (assignment === 'R' || assignment === 'C') {
            return { allowed: true, reason: "AI Agent can ".concat(action, " as it is ").concat(assignment, ".") };
        }
        return { allowed: false, reason: "AI Agent is ".concat(assignment || 'blank', " for ").concat(decision, ", cannot ").concat(action, ".") };
    }
    // Find who the 'A' is
    var aRole;
    for (var _i = 0, _a = Object.entries(matrix[decision]); _i < _a.length; _i++) {
        var _b = _a[_i], r = _b[0], a = _b[1];
        if (a === 'A')
            aRole = r;
    }
    if (action === 'commit') {
        if (assignment === 'A') {
            return { allowed: true, reason: "Role is Accountable for ".concat(decision, ".") };
        }
        if (assignment === 'R') {
            return { allowed: true, reason: "Role is Responsible for ".concat(decision, ", assuming approval from A."), required_approver: aRole };
        }
        return { allowed: false, reason: "Role is ".concat(assignment || 'blank', ", cannot commit."), required_approver: aRole };
    }
    if (action === 'recommend' || action === 'simulate') {
        if (assignment === 'A' || assignment === 'R' || assignment === 'C') {
            return { allowed: true, reason: "Role is ".concat(assignment, ", can ").concat(action, ".") };
        }
        return { allowed: false, reason: "Role is ".concat(assignment || 'blank', ", cannot ").concat(action, ".") };
    }
    return { allowed: false, reason: "Unknown scenario" };
}
