CREATE TABLE users
(
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(255) UNIQUE NOT NULL,
    password   VARCHAR(255)        NOT NULL,
    name       VARCHAR(255),
    role       VARCHAR(50)         NOT NULL CHECK (role IN ('sudo', 'organizer', 'team_manager')),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE teams
(
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    age_group  VARCHAR(50) CHECK (age_group IN ('under_18', 'open', 'adult')),
    logo       VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    manager_id INT          REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE team_members
(
    id       SERIAL PRIMARY KEY,
    name     VARCHAR(255) NOT NULL,
    status   VARCHAR(255) CHECK (status IN ('starting', 'substitute')),
    category VARCHAR(255) CHECK (category IN ('goalkeeper', 'defender', 'midfielder', 'forward', 'coaching_stuff')),
    team_id  INT REFERENCES teams (id) ON DELETE CASCADE
);

-- [[{groupCount:2, groupMemberCount:4}], [{knockoutMemberCount:2}], [{groupCount:2, groupMemberCount:4}, {knockoutMemberCount:2}],
-- [{knockoutMemberCount:2}, single],  [single]]
-- [all phases are seperated by parent array, each element of phases are seperated by child array]
-- each phase either group/knockout/group+knockout/group+single/knockout+single/single
-- phase 1: [groupCount:2, groupMemberCount:4] -> 2 groups each containing 4 teams
-- phase 2: [knockoutMemberCount:2] -> 2 teams will be qualified to knockout stage
-- phase 3: [{groupCount:2, groupMemberCount:4}, {knockoutMemberCount:2}] -> 2 groups each containing
--          4 teams + knockout stage with 2 teams
-- phase 4: [{knockoutMemberCount:2}, single] -> 2 teams will be qualified to knockout stage and single match
-- phase 5: [single] -> 1 single match

CREATE TABLE tournaments
(
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(255) NOT NULL,
    type             int CHECK (type IN (5, 6, 7, 8, 11)),
    location         VARCHAR(255),
    start_date       DATE         NOT NULL,
    end_date         DATE         NOT NULL,
    rules            TEXT,
    format_shortcode JSONB,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    organizer_id     INT REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE teams_tournaments
(
    id            SERIAL PRIMARY KEY,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    team_id       INT REFERENCES teams (id) ON DELETE CASCADE,
    tournament_id INT REFERENCES tournaments (id) ON DELETE CASCADE
);

CREATE TABLE tournament_phases
(
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(255),
    groups_count     INT,
    teams_per_group  INT,
    qualifying_teams INT,
    phase_order      INT,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tournament_id    INT REFERENCES tournaments (id) ON DELETE CASCADE
);

CREATE TABLE tournament_groups
(
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(255),
    group_order         INT,
    double_round_robin  BOOLEAN,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tournament_phase_id INT REFERENCES tournament_phases (id) ON DELETE CASCADE
);

CREATE TABLE groups_teams
(
    id                    SERIAL PRIMARY KEY,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    team_ranking          INT,  --added
    tournament_group_id   INT REFERENCES tournament_groups (id) ON DELETE CASCADE,
    team_id               INT REFERENCES teams (id),
    future_team_reference jsonb -- added;
    -- {type:group, id:1, position:2}
    -- {type:match, id:1, position:0}
    -- position 1 = winner, position 2 = loser
);

CREATE TABLE tournament_brackets
(
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(255),
    bracket_order       INT,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tournament_phase_id INT REFERENCES tournament_phases (id) ON DELETE CASCADE
);

CREATE TABLE matches
(
    id                    SERIAL PRIMARY KEY,
    name                  VARCHAR(255),
    match_type            VARCHAR(50) CHECK (match_type IN ('group', 'bracket', 'single_match')) NOT NULL, --changed
    match_order           INT,                                                                             --added
    future_team_reference jsonb,
    -- added;
    -- {home:{type:'group', id:1, position:2}, away:{type:group, id:2, position:4}}
    -- {home:{type:'match', id:1, position:0}, away:{type:match, id:2, position:1}}
    -- for match position 1 = winner, position 2 = loser
    tournament_group_id   INT,
    round_type            INT,                                                                             --changed; 0 final, 1 semi final..
    start_time            TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    home_team_id          INT REFERENCES teams (id) ON DELETE CASCADE,
    away_team_id          INT REFERENCES teams (id) ON DELETE CASCADE,
    tournament_phase_id   INT REFERENCES tournament_phases (id) ON DELETE CASCADE,
    CONSTRAINT chk_group_phase CHECK (
        (match_type = 'group' AND tournament_group_id IS NOT NULL AND
         round_id IS NULL) OR
        (match_type = 'bracket' AND tournament_group_id IS NULL AND                                        --changed
         round_id IS NOT NULL) OR
        (match_type = 'single_match' AND tournament_group_id IS NULL AND
         round_id IS NULL)
        )
);


CREATE TABLE match_results
(
    id              SERIAL PRIMARY KEY,
    home_team_score INT,
    away_team_score INT,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    match_id        INT REFERENCES matches (id) ON DELETE CASCADE,
    winner_id       INT REFERENCES teams (id) ON DELETE CASCADE
);

--sent by team_manager
-- status: rejected = 0, accepted = 1, pending = 2
CREATE TABLE team_requests
(
    id             SERIAL PRIMARY KEY,
    request_status int CHECK (request_status IN (0, 1, 2)),
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tournament_id  INT REFERENCES tournaments (id) ON DELETE CASCADE,
    team_id        INT REFERENCES teams (id) ON DELETE CASCADE
);

CREATE TABLE subscriptions
(
    id                     SERIAL PRIMARY KEY,
    plan_id                int            NOT NULL,
    stripe_subscription_id varchar(255)   NOT NULL,
    subscription_amount    decimal(10, 2) NOT NULL,
    activation_date        TIMESTAMP      NOT NULL,
    expire_date            TIMESTAMP      NOT NULL,
    active                 BOOLEAN        NOT NULL,
    pending_cancel         BOOLEAN,
    updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    organizer_id           INT REFERENCES users (id) ON DELETE CASCADE
);
