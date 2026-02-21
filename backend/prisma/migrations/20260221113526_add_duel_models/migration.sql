-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL DEFAULT 1200,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_username_idx`(`username`),
    INDEX `users_email_idx`(`email`),
    INDEX `users_rating_idx`(`rating`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `problems` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `difficulty` ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL DEFAULT 'MEDIUM',
    `time_limit` INTEGER NOT NULL DEFAULT 2000,
    `memory_limit` INTEGER NOT NULL DEFAULT 262144,
    `sample_input` TEXT NULL,
    `sample_output` TEXT NULL,
    `constraints` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `problems_slug_key`(`slug`),
    INDEX `problems_slug_idx`(`slug`),
    INDEX `problems_difficulty_idx`(`difficulty`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `test_cases` (
    `id` VARCHAR(191) NOT NULL,
    `problem_id` VARCHAR(191) NOT NULL,
    `input` TEXT NOT NULL,
    `output` TEXT NOT NULL,
    `is_hidden` BOOLEAN NOT NULL DEFAULT false,
    `order_index` INTEGER NOT NULL DEFAULT 0,

    INDEX `test_cases_problem_id_is_hidden_idx`(`problem_id`, `is_hidden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contests` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NOT NULL,
    `status` ENUM('UPCOMING', 'ACTIVE', 'ENDED') NOT NULL DEFAULT 'UPCOMING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `contests_slug_key`(`slug`),
    INDEX `contests_status_idx`(`status`),
    INDEX `contests_start_time_end_time_idx`(`start_time`, `end_time`),
    INDEX `contests_slug_idx`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contest_problems` (
    `id` VARCHAR(191) NOT NULL,
    `contest_id` VARCHAR(191) NOT NULL,
    `problem_id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `points` INTEGER NOT NULL DEFAULT 100,
    `order_idx` INTEGER NOT NULL DEFAULT 0,

    INDEX `contest_problems_contest_id_idx`(`contest_id`),
    UNIQUE INDEX `contest_problems_contest_id_problem_id_key`(`contest_id`, `problem_id`),
    UNIQUE INDEX `contest_problems_contest_id_label_key`(`contest_id`, `label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contest_participants` (
    `id` VARCHAR(191) NOT NULL,
    `contest_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `score` INTEGER NOT NULL DEFAULT 0,
    `penalty` INTEGER NOT NULL DEFAULT 0,
    `rank` INTEGER NULL,
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `contest_participants_contest_id_score_penalty_idx`(`contest_id`, `score`, `penalty`),
    UNIQUE INDEX `contest_participants_contest_id_user_id_key`(`contest_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `submissions` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `problem_id` VARCHAR(191) NOT NULL,
    `contest_id` VARCHAR(191) NULL,
    `language` ENUM('CPP', 'PYTHON', 'JAVA') NOT NULL,
    `source_code` TEXT NOT NULL,
    `verdict` ENUM('PENDING', 'RUNNING', 'ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILATION_ERROR') NOT NULL DEFAULT 'PENDING',
    `execution_time` INTEGER NULL,
    `memory_used` INTEGER NULL,
    `tests_passed` INTEGER NOT NULL DEFAULT 0,
    `tests_total` INTEGER NOT NULL DEFAULT 0,
    `compile_output` TEXT NULL,
    `stderr` TEXT NULL,
    `is_contest` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `submissions_user_id_problem_id_idx`(`user_id`, `problem_id`),
    INDEX `submissions_contest_id_user_id_problem_id_idx`(`contest_id`, `user_id`, `problem_id`),
    INDEX `submissions_verdict_idx`(`verdict`),
    INDEX `submissions_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `duels` (
    `id` VARCHAR(191) NOT NULL,
    `problem_id` VARCHAR(191) NOT NULL,
    `timer_option` ENUM('FIVE_MINS', 'THIRTY_MINS', 'ONE_HOUR') NOT NULL,
    `status` ENUM('WAITING', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED') NOT NULL DEFAULT 'WAITING',
    `started_at` DATETIME(3) NULL,
    `ended_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `duels_status_idx`(`status`),
    INDEX `duels_created_at_idx`(`created_at`),
    INDEX `duels_problem_id_idx`(`problem_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `duel_participants` (
    `id` VARCHAR(191) NOT NULL,
    `duel_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `submission_id` VARCHAR(191) NULL,
    `rating_before` INTEGER NOT NULL,
    `rating_after` INTEGER NULL,
    `is_winner` BOOLEAN NULL,
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `duel_participants_submission_id_key`(`submission_id`),
    INDEX `duel_participants_duel_id_idx`(`duel_id`),
    INDEX `duel_participants_user_id_idx`(`user_id`),
    UNIQUE INDEX `duel_participants_duel_id_user_id_key`(`duel_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `duel_queues` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `timer_option` ENUM('FIVE_MINS', 'THIRTY_MINS', 'ONE_HOUR') NOT NULL,
    `min_rating` INTEGER NOT NULL,
    `max_rating` INTEGER NOT NULL,
    `queued_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `duel_queues_timer_option_min_rating_max_rating_idx`(`timer_option`, `min_rating`, `max_rating`),
    INDEX `duel_queues_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `test_cases` ADD CONSTRAINT `test_cases_problem_id_fkey` FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contest_problems` ADD CONSTRAINT `contest_problems_contest_id_fkey` FOREIGN KEY (`contest_id`) REFERENCES `contests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contest_problems` ADD CONSTRAINT `contest_problems_problem_id_fkey` FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contest_participants` ADD CONSTRAINT `contest_participants_contest_id_fkey` FOREIGN KEY (`contest_id`) REFERENCES `contests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contest_participants` ADD CONSTRAINT `contest_participants_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_problem_id_fkey` FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_contest_id_fkey` FOREIGN KEY (`contest_id`) REFERENCES `contests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `duels` ADD CONSTRAINT `duels_problem_id_fkey` FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `duel_participants` ADD CONSTRAINT `duel_participants_duel_id_fkey` FOREIGN KEY (`duel_id`) REFERENCES `duels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `duel_participants` ADD CONSTRAINT `duel_participants_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `duel_participants` ADD CONSTRAINT `duel_participants_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
