<?php
// Login status for the new front end. Deploy to iemakerlab/booking/api/session.php.
//
// Logged in:  200 {"logged_in": true, "user_id": "...", "user_email": "..."}
// Logged out: 200 {"logged_in": false}  (or 401 from authorization.php if the token cookie is gone)
//
// authentication.php also stores user_email in the PHP session, which MyBooking.php
// needs for confirmation emails. The old PHP pages did that on every page load;
// the static front end relies on this endpoint instead.

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

session_start();

if (!isset($_SESSION['id_token'])) {
    echo json_encode(['logged_in' => false]);
    exit();
}

// Both files call session_start() again; drop the resulting notices so they don't corrupt the JSON
ob_start();
require $_SERVER['DOCUMENT_ROOT'] . '/ic/iemakerlab/booking/polyusso/authentication.php';
require __DIR__ . '/authorization.php';
ob_end_clean();

echo json_encode([
    'logged_in'  => true,
    'user_id'    => $user_id,
    'user_email' => $user_email,
]);
